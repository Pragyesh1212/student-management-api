
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { UploadedImage } from '../students/types/uploaded-image.type';

@Injectable()
export class S3Service {
  private readonly s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION,
    });
  }

  private get bucketName(): string {
    const bucket = process.env.AWS_S3_BUCKET;

    if (!bucket) {
      throw new InternalServerErrorException(
        'S3 bucket configuration is missing',
      );
    }

    return bucket;
  }

  async uploadImage(
    studentId: string,
    file: UploadedImage,
  ): Promise<string> {
    const extension = extname(file.originalname).toLowerCase();
    const key = `students/${studentId}/${randomUUID()}${extension}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return key;
  }

  async getImageUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
      { expiresIn: 3600 },
    ).catch(async () => {
      throw new InternalServerErrorException(
        'Unable to generate image URL',
      );
    });
  }

  async deleteImage(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }
}
