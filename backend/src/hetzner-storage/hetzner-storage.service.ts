import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

  /**
   * Lista las keys existentes bajo folder/ que pertenecen a este slot — tanto el nombre
   * viejo determinístico ("slot.ext", ej. image1.jpg) como el nuevo con timestamp
   * ("slot-<ms>.ext"). Se usa para limpiar versiones anteriores DESPUÉS de subir la nueva
   * (ver uploadProductImage en el controller), nunca antes — así nunca hay una ventana en
   * la que el slot quede sin ninguna imagen mientras se sube la siguiente.
   */
  async listSlotKeys(folder: string, slot: string): Promise<string[]> {
    const result = await this.s3.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: `${folder}/` })
    );
    return (result.Contents ?? [])
      .map((o) => o.Key)
      .filter((key): key is string => !!key)
      .filter((key) => {
        const base = key.slice(folder.length + 1); // quita "folder/"
        return (
          base === slot ||
          base.startsWith(`${slot}.`) ||
          base.startsWith(`${slot}-`)
        );
      });
  }

  async deleteKeys(keys: string[]): Promise<void> {
    await Promise.allSettled(keys.map((k) => this.deleteByKey(k)));
  }

  async uploadPrivateBuffer(
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
        ContentType: 'application/sql',
      })
    );
    return fileKey;
  }

  async listFolder(
    folder: string
  ): Promise<{ key: string; size: number; lastModified: Date }[]> {
    const result = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: `${folder}/`,
      })
    );
    return (result.Contents ?? [])
      .filter((obj) => obj.Key && obj.Key !== `${folder}/`)
      .map((obj) => ({
        key: obj.Key!,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified ?? new Date(),
      }))
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  }

  async getSignedDownloadUrl(
    key: string,
    expiresInSeconds = 3600
  ): Promise<string> {
    const fileName = key.split('/').pop() ?? 'respaldo.sql';
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${fileName}"`,
    });
    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }

  // Pégalo justo antes de deleteByKey
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key })
      );
      return true;
    } catch (err: any) {
      if (err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }
}
