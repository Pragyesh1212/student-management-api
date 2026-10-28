
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
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ReplaceStudentDto } from './dto/replace-student.dto';
import type { Response } from 'express';
import type { UploadedImage } from './types/uploaded-image.type';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Put(':id')
  replace(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() replaceStudentDto: ReplaceStudentDto,
  ) {
    return this.studentsService.replace(id, replaceStudentDto);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image'))
  uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedImage,
  ) {
    return this.studentsService.uploadImage(id, file);
  }

  @Get(':id/image')
  async getImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const image = await this.studentsService.getImageUrl(id);

    // New images are stored in S3 and returned as a presigned URL.
    if (typeof image === 'string') {
      return res.redirect(302, image);
    }

    // Legacy images are still stored in PostgreSQL.
    res.setHeader('Content-Type', image.imageType);
    res.setHeader('Cache-Control', 'no-store');

    return res.send(Buffer.from(image.imageData));
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.studentsService.remove(id);
  }
}
