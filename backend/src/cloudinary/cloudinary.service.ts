import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  async uploadPdf({
    buffer,
    fileName,
    empresaNit,
    empresaNombre,
    usuarioNombre,
    tipo, // 'recibos' | 'pedidos'
  }: {
    buffer: Buffer;
    fileName: string;
    empresaNit: string;
    empresaNombre: string;
    usuarioNombre: string;
    tipo: 'recibos' | 'pedidos';
  }): Promise<{ url: string; public_id: string }> {
    const folderPath = this.getFolderPath({
      empresaNit,
      empresaNombre,
      usuarioNombre,
      tipo,
    });

    const publicId = `${folderPath}/${fileName.replace(/\s+/g, '_')}`;

    const stream = Readable.from(buffer);

    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'raw',
            public_id: publicId,
            overwrite: true,
            use_filename: true,
            type: 'upload',
            folder: undefined, // si usas public_id con estructura
          },
          (error, result) => {
            if (error)
              return reject(
                new Error(error.message || 'Error al subir a Cloudinary')
              );

            if (!result) return reject(new Error('No se obtuvo resultado'));
            resolve(result);
          }
        );

        stream.pipe(uploadStream);
      });

      this.logger.log(`✅ Archivo subido a Cloudinary: ${result.secure_url}`);

      return {
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      this.logger.error('❌ Error subiendo archivo a Cloudinary', error);
      throw new Error('No se pudo subir el archivo');
    }
  }

  private getFolderPath({
    empresaNit,
    empresaNombre,
    usuarioNombre,
    tipo,
  }: {
    empresaNit: string;
    empresaNombre: string;
    usuarioNombre: string;
    tipo: 'recibos' | 'pedidos';
  }): string {
    const safeEmpresa = `${empresaNit}-${empresaNombre}`.replace(/\s+/g, '_');
    const safeUsuario = usuarioNombre.replace(/\s+/g, '_');
    return `empresas/${safeEmpresa}/${safeUsuario}/${tipo}`;
  }

  private getFolderPathProducto({ empresaId }: { empresaId: string }): string {
    const safeEmpresa = `${empresaId}`.replace(/\s+/g, '_');
    return `empresas/${safeEmpresa}/productos`;
  }

  private async uploadImageToCloudinary({
    buffer,
    publicId,
  }: {
    buffer: Buffer;
    publicId: string;
  }): Promise<{ url: string; public_id: string }> {
    const stream = Readable.from(buffer);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: publicId,
          overwrite: true,
          use_filename: true,
        },
        (error, result) => {
          if (error)
            return reject(new Error(error.message || 'Error al subir imagen'));
          if (!result)
            return reject(new Error('No se obtuvo resultado de Cloudinary'));
          resolve({ url: result.secure_url, public_id: result.public_id });
        }
      );

      stream.pipe(uploadStream);
    });
  }

  async uploadProductImage({
    buffer,
    fileName,
    empresaId,
  }: {
    buffer: Buffer;
    fileName: string;
    empresaId: string;
  }): Promise<{ url: string; public_id: string }> {
    const folderPath = this.getFolderPathProducto({
      empresaId,
    });

    const publicId = `${folderPath}/${fileName.replace(/\s+/g, '_')}`;
    const stream = Readable.from(buffer);

    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            public_id: publicId,
            overwrite: true,
            use_filename: true,
          },
          (error, result) => {
            if (error)
              return reject(
                new Error(error.message || 'Error al subir imagen')
              );
            if (!result)
              return reject(new Error('No se obtuvo resultado de Cloudinary'));
            resolve(result);
          }
        );

        stream.pipe(uploadStream);
      });

      this.logger.log(
        `✅ Imagen de producto subida a Cloudinary: ${result.secure_url}`
      );
      return {
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      this.logger.error(
        '❌ Error subiendo imagen de producto a Cloudinary',
        error
      );
      throw new Error('No se pudo subir la imagen');
    }
  }

  async uploadLogoEmpresa({
    buffer,
    fileName,
    empresaId,
  }: {
    buffer: Buffer;
    fileName: string;
    empresaId: string;
  }): Promise<{ url: string; public_id: string }> {
    const safeEmpresa = empresaId.replace(/\s+/g, '_');
    const publicId = `empresas/${safeEmpresa}/logos/${fileName.replace(/\s+/g, '_')}`;

    try {
      const result = await this.uploadImageToCloudinary({ buffer, publicId });
      this.logger.log(`✅ Logo de empresa subido a Cloudinary: ${result.url}`);
      return result;
    } catch (error) {
      this.logger.error(
        '❌ Error subiendo logo de empresa a Cloudinary',
        error
      );
      throw new Error('No se pudo subir el logo');
    }
  }
}
