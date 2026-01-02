import express from "express";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { cadConversionService } from "../services/cadConversionService.js";

const router = express.Router();

const thumbnailsDir = path.join(process.cwd(), "uploads", "thumbnails");
(async () => {
  try {
    await fs.mkdir(thumbnailsDir, { recursive: true });
  } catch {}
})();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [
      ".stl",
      ".step",
      ".stp",
      ".iges",
      ".igs",
      ".sldprt",
      ".obj",
      ".3mf",
      ".ply",
    ];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${fileExtension} not supported`));
    }
  },
});

// Upload and convert 3D file
router.post("/upload-3d", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { originalname, path: filePath, mimetype, size } = req.file;
    const fileExtension = path.extname(originalname).toLowerCase();

    // For STL files, return the original file path
    if (fileExtension === ".stl") {
      return res.json({
        success: true,
        originalPath: filePath,
        previewPath: `/api/conversion/files/${path.basename(filePath)}`,
        fileType: "stl",
        fileName: originalname,
        size,
      });
    }

    // For CAD files, attempt conversion
    const conversionResult = await cadConversionService.convertToGLTF(
      filePath,
      originalname,
    );

    if (conversionResult.success && conversionResult.gltfPath) {
      return res.json({
        success: true,
        originalPath: filePath,
        previewPath: `/api/conversion/converted/${path.basename(conversionResult.gltfPath)}`,
        fileType: "gltf",
        fileName: originalname,
        size,
      });
    } else {
      // If conversion fails, return original file info with fallback
      return res.json({
        success: true,
        originalPath: filePath,
        previewPath: null,
        fileType: "unsupported",
        fileName: originalname,
        size,
        conversionError: conversionResult.error,
      });
    }
  } catch (error) {
    console.error("File upload/conversion error:", error);
    res.status(500).json({
      error: "File upload/conversion failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Serve uploaded files
router.get("/files/:filename", (req, res) => {
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  const filename = req.params.filename;
  const filePath = path.join(process.cwd(), "uploads", filename);

  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: "File not found" });
    }
  });
});

// Serve converted files
router.get("/converted/:filename", (req, res) => {
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  const filename = req.params.filename;
  const filePath = path.join(process.cwd(), "uploads", "converted", filename);

  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: "Converted file not found" });
    }
  });
});

// Save thumbnail PNG from data URL
router.post("/save-thumbnail", async (req, res) => {
  try {
    const { image, source } = req.body || {};
    if (
      !image ||
      typeof image !== "string" ||
      !image.startsWith("data:image")
    ) {
      return res.status(400).json({ error: "Invalid image data" });
    }
    const base64 = image.split(",")[1];
    const buffer = Buffer.from(base64, "base64");
    const baseName = source
      ? path.basename(source, path.extname(source))
      : `thumb-${Date.now()}`;
    const fileName = `${baseName}.png`;
    const filePath = path.join(thumbnailsDir, fileName);
    await fs.writeFile(filePath, buffer);
    return res.json({
      success: true,
      url: `/api/conversion/thumbnails/${fileName}`,
    });
  } catch (e) {
    console.error("save-thumbnail error", e);
    return res.status(500).json({ error: "Failed to save thumbnail" });
  }
});

// Serve thumbnails
router.get("/thumbnails/:filename", (req, res) => {
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  const filename = req.params.filename;
  const filePath = path.join(thumbnailsDir, filename);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: "Thumbnail not found" });
    }
  });
});

export default router;
