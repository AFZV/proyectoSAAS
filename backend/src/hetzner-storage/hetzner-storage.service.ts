import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class HetznerStorageService {
  private s3: S3Client;
  private bucket: string;
  private baseUrl: string;

  constructor() {
    this.bucket = process.env.HETZNER_S3_BUCKET!;
    this.baseUrl = process.env.FILES_BASE_URL!;
    this.s3 = new S3Client({
      region: 'eu-central', // Hetzner usa región genérica
      endpoint: process.env.HETZNER_S3_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.HETZNER_S3_ACCESS_KEY!,
        secretAccessKey: process.env.HETZNER_S3_SECRET_KEY!,
      },
    });
  }

  /**
   * Sube un archivo y devuelve la URL pública
   * @param buffer Contenido del archivo
   * @param fileName Nombre del archivo final (ej: 'pedido_123.pdf')
   * @param folder Carpeta en el bucket (ej: 'empresas/uuid/pedidos')
   */
  async uploadFile(
    buffer: Buffer,
    fileName: string,
    folder: string
  ): Promise<string> {
    const fileKey = `${folder}/${fileName}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: buffer,
        ACL: 'public-read', // necesario para URL pública
      })
    );

    // Devuelve la URL pública con tu subdominio
    return `${this.baseUrl}/${fileKey}`;
  }
}
