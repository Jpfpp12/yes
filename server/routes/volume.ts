import { RequestHandler } from "express";
import multer from "multer";
import { Buffer } from "buffer";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.stl', '.obj', '.ply', '.3mf', '.step'];
    const fileExtension = '.' + file.originalname.split('.').pop()?.toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format'));
    }
  },
});

// STL file parser for volume calculation
function parseSTLVolume(buffer: Buffer): number {
  try {
    // Check if it's binary STL
    if (buffer.length < 80) {
      throw new Error('File too small to be a valid STL');
    }

    // Read header (80 bytes) and triangle count (4 bytes)
    const triangleCount = buffer.readUInt32LE(80);
    
    // Binary STL: 80 bytes header + 4 bytes count + (50 bytes per triangle)
    const expectedSize = 80 + 4 + (triangleCount * 50);
    
    if (buffer.length !== expectedSize) {
      // Might be ASCII STL, try parsing as text
      return parseASCIISTLVolume(buffer.toString('utf8'));
    }

    // Parse binary STL
    let volume = 0;
    let offset = 84; // Skip header and triangle count

    for (let i = 0; i < triangleCount; i++) {
      // Skip normal vector (12 bytes)
      offset += 12;
      
      // Read vertices (3 vertices × 3 coordinates × 4 bytes each)
      const v1 = {
        x: buffer.readFloatLE(offset),
        y: buffer.readFloatLE(offset + 4),
        z: buffer.readFloatLE(offset + 8)
      };
      offset += 12;
      
      const v2 = {
        x: buffer.readFloatLE(offset),
        y: buffer.readFloatLE(offset + 4),
        z: buffer.readFloatLE(offset + 8)
      };
      offset += 12;
      
      const v3 = {
        x: buffer.readFloatLE(offset),
        y: buffer.readFloatLE(offset + 4),
        z: buffer.readFloatLE(offset + 8)
      };
      offset += 12;
      
      // Skip attribute byte count (2 bytes)
      offset += 2;
      
      // Calculate volume contribution using divergence theorem
      volume += calculateTriangleVolume(v1, v2, v3);
    }

    return Math.abs(volume / 6.0); // Convert to cubic millimeters
  } catch (error) {
    console.error('Error parsing STL:', error);
    throw new Error('Failed to parse STL file');
  }
}

function parseASCIISTLVolume(content: string): number {
  try {
    const lines = content.split('\n');
    const vertices: Array<{x: number, y: number, z: number}> = [];
    let volume = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('vertex')) {
        const coords = line.split(/\s+/).slice(1).map(Number);
        vertices.push({ x: coords[0], y: coords[1], z: coords[2] });
        
        if (vertices.length === 3) {
          // Calculate volume for this triangle
          volume += calculateTriangleVolume(vertices[0], vertices[1], vertices[2]);
          vertices.length = 0; // Reset for next triangle
        }
      }
    }
    
    return Math.abs(volume / 6.0);
  } catch (error) {
    console.error('Error parsing ASCII STL:', error);
    throw new Error('Failed to parse ASCII STL file');
  }
}

function calculateTriangleVolume(v1: {x: number, y: number, z: number}, 
                                v2: {x: number, y: number, z: number}, 
                                v3: {x: number, y: number, z: number}): number {
  // Using divergence theorem: V = (1/6) * sum(v1 · (v2 × v3))
  const cross = {
    x: v2.y * v3.z - v2.z * v3.y,
    y: v2.z * v3.x - v2.x * v3.z,
    z: v2.x * v3.y - v2.y * v3.x
  };
  
  return v1.x * cross.x + v1.y * cross.y + v1.z * cross.z;
}

// Estimate volume for other file formats (placeholder)
function estimateVolumeFromSize(fileSize: number, fileExtension: string): number {
  // This is a rough estimation - in production, you'd want proper parsers for each format
  const baseVolume = fileSize / 1024; // Start with file size in KB
  
  switch (fileExtension) {
    case 'obj':
      return baseVolume * 50; // OBJ files are typically text-based, so estimate
    case 'ply':
      return baseVolume * 40; // PLY files can be binary or ASCII
    case '3mf':
      return baseVolume * 30; // 3MF is compressed
    case 'step':
    case 'stp':
      return baseVolume * 60; // STEP files are verbose
    default:
      return baseVolume * 45; // Default estimation
  }
}

export const handleVolumeCalculation: RequestHandler = (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ 
        error: 'File upload failed', 
        message: err.message 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file provided' 
      });
    }

    try {
      const fileExtension = '.' + req.file.originalname.split('.').pop()?.toLowerCase();
      let volume: number;

      if (fileExtension === '.stl') {
        volume = parseSTLVolume(req.file.buffer);
      } else {
        // For other formats, use estimation (in production, implement proper parsers)
        volume = estimateVolumeFromSize(req.file.size, fileExtension);
        console.log(`Using volume estimation for ${fileExtension} file`);
      }

      res.json({
        success: true,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        volume: Math.round(volume * 100) / 100, // Round to 2 decimal places
        unit: 'cubic_mm',
        method: fileExtension === '.stl' ? 'calculated' : 'estimated'
      });

    } catch (error) {
      console.error('Volume calculation error:', error);
      res.status(500).json({ 
        error: 'Volume calculation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
};
