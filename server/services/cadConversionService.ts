import { promises as fs } from 'fs';
import path from 'path';

export interface ConversionResult {
  success: boolean;
  gltfPath?: string;
  originalPath: string;
  error?: string;
}

class CADConversionService {
  private uploadsDir: string;
  private convertedDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.convertedDir = path.join(process.cwd(), 'uploads', 'converted');
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(this.convertedDir, { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  async convertToGLTF(originalFilePath: string, originalFileName: string): Promise<ConversionResult> {
    const fileExtension = path.extname(originalFileName).toLowerCase();

    try {
      // Check if file exists
      await fs.access(originalFilePath);

      // For now, return unsupported for CAD formats
      // In production, implement proper CAD to GLTF conversion
      return {
        success: false,
        originalPath: originalFilePath,
        error: `CAD conversion not implemented yet for ${fileExtension} format`
      };

    } catch (error) {
      console.error('CAD conversion error:', error);
      return {
        success: false,
        originalPath: originalFilePath,
        error: error instanceof Error ? error.message : 'Unknown conversion error'
      };
    }
  }


  async getConvertedFilePath(originalFileName: string): Promise<string | null> {
    const baseName = path.basename(originalFileName, path.extname(originalFileName));
    try {
      const files = await fs.readdir(this.convertedDir);
      const convertedFile = files.find(file => file.startsWith(baseName) && file.endsWith('.gltf'));
    
      if (convertedFile) {
        return path.join(this.convertedDir, convertedFile);
      }
    } catch (error) {
      console.error('Error reading converted directory:', error);
    }
    
    return null;
  }

  async cleanup(filePath: string) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }
  }
}

export const cadConversionService = new CADConversionService();
