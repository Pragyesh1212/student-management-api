
import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
    Put,
    Delete,
    Res,
} from '@nestjs/common';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ReplaceStudentDto } from './dto/replace-student.dto';
import type { Response } from 'express';
import type { UploadedImage } from './types/uploaded-image.type';

@Controller('students')
export class StudentsController {
    constructor(private readonly studentsService: StudentsService) { }

    @Post()
    create(@Body() createStudentDto: CreateStudentDto) {
        return this.studentsService.create(createStudentDto);
    }

    @Get()
    findAll() {
        return this.studentsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.studentsService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateStudentDto: UpdateStudentDto,
    ) {
        return this.studentsService.update(id, updateStudentDto);
    }

    @Put(':id')
    replace(
        @Param('id') id: string,
        @Body() replaceStudentDto: ReplaceStudentDto,
    ) {
        return this.studentsService.replace(id, replaceStudentDto);
    }

    @Post(':id/image')
    @UseInterceptors(FileInterceptor('image'))
    uploadImage(
        @Param('id') id: string,
        @UploadedFile() file: UploadedImage,
    ) {
        return this.studentsService.uploadImage(id, file);
    }

    @Get(':id/image')
    async getImage(
        @Param('id') id: string,
        @Res() res: Response,
    ) {
        const image = await this.studentsService.getImage(id);

        res.setHeader('Content-Type', image.imageType);
        res.setHeader('Cache-Control', 'no-store');

        return res.send(image.imageData);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.studentsService.remove(id);
    }
}
