import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UploadFileDto {
  @IsNotEmpty()
  files: Express.Multer.File[];

  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsNumber()
  projectId?: number;

  @IsString()
  category: string;
}
