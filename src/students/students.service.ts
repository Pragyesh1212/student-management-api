
import {
    Injectable,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ReplaceStudentDto } from './dto/replace-student.dto';
import {
    BadRequestException,
    UnsupportedMediaTypeException,
} from '@nestjs/common';
import { UploadedImage } from './types/uploaded-image.type';

@Injectable()
export class StudentsService {
    constructor(private readonly prisma: PrismaService) { }

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
        // Check whether the student exists
        await this.findOne(id);

        // Replace the student's editable fields
        return this.prisma.student.update({
            where: { id },
            data: {
                ...replaceStudentDto,
                imageData: null,
                imageType: null,
            },
        });
    }


    async uploadImage(id: string, file: UploadedImage) {
        await this.findOne(id);

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

        return this.prisma.student.update({
            where: { id },
            data: {
                imageData: new Uint8Array(file.buffer),
                imageType: file.mimetype,
            },
            select: {
                id: true,
                name: true,
                imageType: true,
            },
        });
    }


    async getImage(id: string) {
        const student = await this.prisma.student.findUnique({
            where: { id },
            select: {
                id: true,
                imageData: true,
                imageType: true,
            },
        });

        if (!student) {
            throw new NotFoundException(`Student with ID ${id} not found`);
        }

        if (!student.imageData || !student.imageType) {
            throw new NotFoundException('Student image not found');
        }

        return {
            imageData: student.imageData,
            imageType: student.imageType,
        };
    }


    async remove(id: string) {
        await this.findOne(id);

        return this.prisma.student.delete({
            where: { id },
        });
    }
}
