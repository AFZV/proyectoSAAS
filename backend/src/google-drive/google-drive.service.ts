import { Injectable, Logger } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import * as path from 'path';

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private driveClient: drive_v3.Drive;
  readonly EMPRESAS_FOLDER_ID = process.env.GOOGLE_DRIVE_EMPRESAS_FOLDER_ID;
  private readonly PERSONAL_EMAIL = 'zuluagaalexis93@gmail.com';

  constructor() {
    const keyPath = path.resolve(process.cwd(), 'service-account.json');

    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.driveClient = google.drive({ version: 'v3', auth });
  }

  async uploadPdf({
    name,
    buffer,
    folderId,
  }: {
    name: string;
    buffer: Buffer;
    folderId: string;
  }): Promise<string> {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    try {
      const response = await this.driveClient.files.create({
        requestBody: {
          name,
          mimeType: 'application/pdf',
          parents: [folderId],
        },
        media: {
          mimeType: 'application/pdf',
          body: stream,
        },
        fields: 'id',
      });

      const fileId = response.data.id;
      if (!fileId)
        throw new Error('No se pudo obtener el ID del archivo subido.');

      await this.driveClient.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' },
      });

      const publicUrl = `https://drive.google.com/file/d/${fileId}/view`;
      this.logger.log(`✅ PDF subido: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      this.logger.error('❌ Error subiendo PDF a Drive', error);
      throw new Error('No se pudo subir el archivo a Google Drive');
    }
  }

  async uploadImage({
    name,
    buffer,
    folderId,
    mimeType = 'image/jpeg',
  }: {
    name: string;
    buffer: Buffer;
    folderId: string;
    mimeType?: string;
  }): Promise<string> {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    try {
      const response = await this.driveClient.files.create({
        requestBody: {
          name,
          mimeType,
          parents: [folderId],
        },
        media: {
          mimeType,
          body: stream,
        },
        fields: 'id',
      });

      const fileId = response.data.id;
      if (!fileId)
        throw new Error(
          'No se pudo obtener el ID del archivo de imagen subido.'
        );

      await this.driveClient.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' },
      });

      const publicUrl = `https://drive.google.com/uc?id=${fileId}`;
      this.logger.log(`✅ Imagen subida: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      this.logger.error('❌ Error subiendo imagen a Drive', error);
      throw new Error('No se pudo subir la imagen a Google Drive');
    }
  }

  async createFolder(name: string, parentId?: string): Promise<string> {
    const folder = await this.driveClient.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : [],
      },
      fields: 'id',
    });

    const folderId = folder.data.id!;
    await this.driveClient.permissions.create({
      fileId: folderId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: this.PERSONAL_EMAIL,
      },
    });

    return folderId;
  }

  // Buscar carpeta por nombre en un padre dado
  async findFolderIdByName(
    name: string,
    parentId: string
  ): Promise<string | null> {
    const res = await this.driveClient.files.list({
      q: `'${parentId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const folder = res.data.files?.[0];
    return folder?.id || null;
  }

  // Buscar carpeta anidada según un path: ['EmpresaXYS', 'UsuarioXYS', 'Recibos']
  async findFolderByPath(
    path: string[],
    rootId: string
  ): Promise<string | null> {
    let currentFolderId = rootId;

    for (const segment of path) {
      const nextFolderId = await this.findFolderIdByName(
        segment,
        currentFolderId
      );
      if (!nextFolderId) {
        this.logger.warn(`❗ Carpeta no encontrada en ruta: ${segment}`);
        return null;
      }
      currentFolderId = nextFolderId;
    }

    return currentFolderId;
  }
}
