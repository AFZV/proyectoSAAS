import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { lookup as mimeLookup } from 'mime-types';
import { createReadStream } from 'fs';

@Injectable()
export class HetznerStorageService {
  private s3: S3Client;
  private bucket: string;
  public baseUrl: string;

  constructor() {
    this.bucket = process.env.HETZNER_S3_BUCKET!;
    this.baseUrl = process.env.FILES_BASE_URL!;
    this.s3 = new S3Client({
      region: 'eu-central',
      endpoint: process.env.HETZNER_S3_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.HETZNER_S3_ACCESS_KEY!,
        secretAccessKey: process.env.HETZNER_S3_SECRET_KEY!,
      },
    });
  }

  async uploadFile(
    buffer: Buffer,
    fileName: string,
    folder: string
  ): Promise<string> {
    const fileKey = `${folder}/${fileName}`;

    const lookupResult = mimeLookup(fileName); // lookupResult: string | false
    const contentType: string =
      typeof lookupResult === 'string'
        ? lookupResult
        : 'application/octet-stream';

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: buffer,
        ACL: 'public-read',
        ContentType: contentType,
      })
    );

    return `${this.baseUrl}/${fileKey}`;
  }
  // Sube el PDF privado y devuelve URL firmado (24h por defecto)
  async uploadPublicFromPath(
    filePath: string,
    fileName: string,
    folder: string
  ): Promise<{ key: string; url: string }> {
    const fileKey = `${folder}/${fileName}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: createReadStream(filePath),
        ACL: 'public-read',
        ContentType: 'application/pdf',
        // ❗ Antes: 'attachment' -> forzaba descarga
        ContentDisposition: `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    return { key: fileKey, url: `${this.baseUrl}/${fileKey}` };
  }

  async deleteByKey(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    );
  }
}
