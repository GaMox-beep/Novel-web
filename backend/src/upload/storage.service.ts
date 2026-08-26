import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private readonly supabase: ReturnType<typeof createClient>;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_KEY must be defined in environment variables',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Upload file buffer lên Supabase Storage bucket
   * @param file Express.Multer.File
   * @param bucketName default 'covers'
   * @returns Public URL của file sau khi upload
   */
  async uploadFile(
    file: Express.Multer.File,
    bucketName: string = 'covers',
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided for upload');
    }

    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
    const filePath = `${fileName}`;

    const { data, error } = await this.supabase.storage
      .from(bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new InternalServerErrorException(
        `Failed to upload image to Supabase Storage: ${error.message}`,
      );
    }

    const { data: publicUrlData } = this.supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }
}
