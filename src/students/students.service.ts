
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ReplaceStudentDto } from './dto/replace-student.dto';
import type { UploadedImage } from './types/uploaded-image.type';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async create(createStudentDto: CreateStudentDto) {
    try {
      return await this.prisma.student.create({
        data: createStudentDto,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.student.findMany();
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    return student;
  }

  async update(id: string, updateStudentDto: UpdateStudentDto) {
    await this.findOne(id);

    try {
      return await this.prisma.student.update({
        where: { id },
        data: updateStudentDto,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }


  async replace(id: string, replaceStudentDto: ReplaceStudentDto) {
    const existing = await this.findOne(id);

    const updated = await this.prisma.student.update({
      where: { id },
      data: {
        ...replaceStudentDto,
        imageData: null,
        imageType: null,
        imageKey: null,
      },
    });

    // The database update has succeeded. A failed S3 cleanup must not
    // make the API report that the replacement itself failed.
    if (existing.imageKey) {
      try {
        await this.s3Service.deleteImage(existing.imageKey);
      } catch (error) {
        console.error('Unable to delete replaced S3 image:', error);
      }
    }

    return updated;
  }

  async uploadImage(id: string, file: UploadedImage) {
    const existing = await this.findOne(id);

    if (!file) {
      throw new BadRequestException('Please upload an image');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        'Only JPEG, PNG, and WebP images are allowed',
      );
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      throw new BadRequestException('Image size must not exceed 5 MB');
    }

    const newKey = await this.s3Service.uploadImage(id, file);

    let updated;

    try {
      updated = await this.prisma.student.update({
        where: { id },
        data: {
          imageData: null,
          imageType: null,
          imageKey: newKey,
        },
        select: {
          id: true,
          name: true,
          imageKey: true,
        },
      });
    } catch (error) {
      // Roll back the new object only when the database update fails.
      try {
        await this.s3Service.deleteImage(newKey);
      } catch (cleanupError) {
        console.error('Unable to clean up uploaded S3 image:', cleanupError);
      }

      throw error;
    }

    // Generate the URL after the database update, outside the rollback
    // block. A URL-generation failure must not delete the saved image.
    const imageUrl = await this.s3Service.getImageUrl(newKey);

    // Delete the old S3 object only after the new image is saved.
    if (existing.imageKey && existing.imageKey !== newKey) {
      try {
        await this.s3Service.deleteImage(existing.imageKey);
      } catch (error) {
        console.error('Unable to delete previous S3 image:', error);
      }
    }

    return {
      id: updated.id,
      name: updated.name,
      imageUrl,
    };
  }

   async getImageUrl(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        imageKey: true,
        imageData: true,
        imageType: true,
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    if (student.imageKey) {
      return this.s3Service.getImageUrl(student.imageKey);
    }

    // Backward compatibility for images stored in PostgreSQL before
    // S3 integration. The controller needs to support this result too.
    if (student.imageData && student.imageType) {
      return {
        imageData: student.imageData,
        imageType: student.imageType,
      };
    }

    throw new NotFoundException('Student image not found');
  }

   async remove(id: string) {
    const student = await this.findOne(id);

    const deleted = await this.prisma.student.delete({
      where: { id },
    });

    if (student.imageKey) {
      try {
        await this.s3Service.deleteImage(student.imageKey);
      } catch (error) {
        console.error('Unable to delete S3 image for removed student:', error);
      }
    }

    return deleted;
  }
}
