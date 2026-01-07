import { useState } from "react";
import { generateThumbnail } from "@/lib/thumbnail";
import {
  calculateEstimatedCost,
  calculateWeight,
  MATERIALS,
  type PrintType,
} from "@/lib/printing";
import type { VolumeCalculationResponse } from "@shared/api";

export interface UploadedFile {
  id: string;
  file: File;
  thumbnail: string;
  previewPath?: string;
  fileType?: "stl" | "gltf" | "unsupported";
  printType: PrintType | string;
  material: string;
  finish: string;
  quantity: number;
  volume: number;
  weight: number;
  volumeMethod: "calculated" | "estimated";
  estimatedCost: number;
  isCalculatingVolume?: boolean;
  serverPath?: string;
}

export function useFileUpload() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Client-side STL Parser to avoid server limits
  const parseSTLVolumeClient = async (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (b) => {
        const buffer = b.target?.result as ArrayBuffer;
        const view = new DataView(buffer);

        try {
          // Binary STL check (80 bytes header + 4 bytes count)
          if (buffer.byteLength < 84) throw new Error("File too small");

          const triangleCount = view.getUint32(80, true);
          const expectedSize = 84 + (triangleCount * 50);

          if (buffer.byteLength !== expectedSize) {
            // Basic fallback for ASCII or corrupt files: return 0 to trigger estimation
            // Parsing ASCII client-side can be slow/complex, better to estimate
            resolve(0);
            return;
          }

          let totalVolume = 0;
          let offset = 84;

          for (let i = 0; i < triangleCount; i++) {
            // Normal (12 bytes) - skip

            // Vertices (12 bytes per vertex)
            const v1x = view.getFloat32(offset + 12, true);
            const v1y = view.getFloat32(offset + 16, true);
            const v1z = view.getFloat32(offset + 20, true);

            const v2x = view.getFloat32(offset + 24, true);
            const v2y = view.getFloat32(offset + 28, true);
            const v2z = view.getFloat32(offset + 32, true);

            const v3x = view.getFloat32(offset + 36, true);
            const v3y = view.getFloat32(offset + 40, true);
            const v3z = view.getFloat32(offset + 44, true);

            // Signed volume of tetrahedron
            // v3 . (v1 x v2) / 6  (or equivalent cross product logic)
            // Using: v1 . (v2 x v3) / 6
            const crossX = v2y * v3z - v2z * v3y;
            const crossY = v2z * v3x - v2x * v3z;
            const crossZ = v2x * v3y - v2y * v3x;

            totalVolume += v1x * crossX + v1y * crossY + v1z * crossZ;

            offset += 50; // 12 normal + 36 vertices + 2 attribute
          }

          resolve(Math.abs(totalVolume / 6000)); // /6 for tetra, /1000 for mm3->cm3
        } catch (e) {
          resolve(0);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const calculateVolume = async (
    file: File,
  ): Promise<{ volume: number; method: "calculated" | "estimated" }> => {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();

      // 1. Try Client-side Exact Calculation for STL
      if (ext === 'stl') {
        const vol = await parseSTLVolumeClient(file);
        if (vol > 0) {
          return { volume: Math.round(vol * 100) / 100, method: "calculated" };
        }
      }

      // 2. Try Server-side for others (if small enough) or mapped formats
      // But server uses 6MB limit. If file > 4MB, skip server to be safe
      if (file.size < 4 * 1024 * 1024 && ['obj', '3mf'].includes(ext || '')) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/calculate-volume", {
          method: "POST",
          body: formData,
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.volume) {
            return { volume: data.volume / 1000, method: data.method };
          }
        }
      }

      throw new Error("Fallback to estimation");
    } catch {
      // 3. Fallback Estimation based on file size
      // simple heuristic: 1MB STL ~= 45 cm3 (very rough, dependent on density/resolution)
      // improved heuristic: size * factor
      const estimatedVolumeInCm3 = (file.size / 1024 / 1024) * 15; // 15 cm3 per MB is a safer conservative estimate? 
      // Actually typically 1MB binary STL is ~15-20k triangles. Surface area correlate... 
      // Let's stick to the previous factor but ensure it's reasonable.
      // previous was (file.size / 1024) * 0.045 = file_bytes * 0.0000439 => 1MB = 46 cm3.
      // This is acceptable for estimation.

      const estimatedVolumeInCm3Old = (file.size / 1024) * 0.045;

      return {
        volume: Math.round(estimatedVolumeInCm3Old * 100) / 100,
        method: "estimated",
      };
    }
  };

  const handleFileUpload = async (files: FileList) => {
    // Process each file
    for (const file of Array.from(files)) {
      const allowedTypes = [
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
      const rawExtension = file.name.split(".").pop()?.toLowerCase();
      const fileExtension = "." + rawExtension;

      if (!allowedTypes.includes(fileExtension)) continue;

      // 1. Create optimistic entry immediately
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const isClientSupported = ["stl", "gltf", "glb"].includes(rawExtension || "");

      // Create local preview URL immediately if supported
      let localPreviewUrl: string | undefined;
      let initialFileType: "stl" | "gltf" | "unsupported" = "unsupported";

      if (isClientSupported) {
        localPreviewUrl = URL.createObjectURL(file);
        // Map extension to fileType
        if (rawExtension === "stl") initialFileType = "stl";
        else if (["gltf", "glb"].includes(rawExtension || "")) initialFileType = "gltf";
      }

      // Generate a temporary thumbnail (placeholder) locally
      const initialThumbnail = await generateThumbnail(file, localPreviewUrl, initialFileType);

      const newFile: UploadedFile = {
        id,
        file,
        thumbnail: initialThumbnail,
        previewPath: localPreviewUrl, // This is available INSTANTLY
        fileType: initialFileType,
        printType: "sla",
        material: "abs_alike",
        finish: "standard",
        quantity: 1,
        volume: 0,
        weight: 0,
        volumeMethod: "estimated",
        estimatedCost: 100, // Placeholder cost
        isCalculatingVolume: true,
      };

      // Update UI immediately
      setUploadedFiles((prev) => [...prev, newFile]);

      // 2. Perform background processing (Upload & Volume Calc)
      (async () => {
        try {
          // Upload for server-side processing if needed (e.g. for non-STL conversion or volume calc validation)
          const formData = new FormData();
          formData.append("file", file);

          // We can proceed to calculate volume even while upload is happening, 
          // but let's stick to the flow: Upload -> Info

          const response = await fetch("/api/conversion/upload-3d", {
            method: "POST",
            body: formData,
          });

          let serverPath = undefined;

          if (response.ok) {
            const uploadResult = await response.json();
            serverPath = uploadResult.originalPath;

            // If we didn't have a local preview (e.g. server converted it), use the server one
            // But for STL/GLTF we stick to local for speed/reliability

            // Attempt to generate a better thumbnail if possible via server or re-gen
            // (optional - for now sticking to local generation is safer for visual preview)

            // If the file was converted (e.g. STEP -> GLTF), we should update the previewPath
            if (uploadResult.fileType === 'gltf' && !localPreviewUrl) {
              // This is where we might still have issues on Netlify if the path is transient
              // But at least we have a fallback
              setUploadedFiles(prev => prev.map(f => f.id === id ? { ...f, previewPath: uploadResult.previewPath, fileType: "gltf" } : f));
            }

            if (uploadResult.success && uploadResult.fileType) {
              setUploadedFiles(prev => prev.map(f => f.id === id ? { ...f, fileType: uploadResult.fileType as any } : f));
            }
          }

          // Calculate Volume
          const { volume, method } = await calculateVolume(file);

          // Calculate final attributes
          setUploadedFiles(prev => prev.map(f => {
            if (f.id !== id) return f;

            const weight = calculateWeight(volume, f.printType as PrintType, f.material);
            const cost = calculateEstimatedCost(volume, weight, f.printType as PrintType, f.material, f.finish, f.quantity);

            return {
              ...f,
              volume,
              weight,
              volumeMethod: method,
              estimatedCost: cost,
              isCalculatingVolume: false,
              serverPath
            };
          }));

        } catch (error) {
          console.error("Background processing failed", error);
          // Fallback estimation
          const fallbackVolume = (file.size / 1024) * 0.045;
          setUploadedFiles(prev => prev.map(f => {
            if (f.id !== id) return f;
            const weight = calculateWeight(fallbackVolume, f.printType as PrintType, f.material);
            return {
              ...f,
              volume: fallbackVolume,
              weight,
              volumeMethod: 'estimated',
              estimatedCost: calculateEstimatedCost(fallbackVolume, weight, f.printType as PrintType, f.material, f.finish, f.quantity),
              isCalculatingVolume: false
            }
          }));
        }
      })();
    }
    // End Loop
  };



  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const updateFileProperty = (
    id: string,
    property: keyof UploadedFile,
    value: any,
  ) => {
    setUploadedFiles((prev) =>
      prev.map((file) => {
        if (file.id !== id) return file;
        const updated: UploadedFile = {
          ...(file as UploadedFile),
          [property]: value,
        };
        if (property === "printType") {
          const availableMaterials = MATERIALS[value as PrintType] || [];
          updated.material = availableMaterials[0]?.value || "";
        }
        if (property === "printType" || property === "material") {
          updated.weight = calculateWeight(
            updated.volume,
            (property === "printType" ? value : updated.printType) as PrintType,
            property === "material" ? value : updated.material,
          );
        }
        if (
          ["printType", "material", "finish", "quantity"].includes(
            property as string,
          )
        ) {
          updated.estimatedCost = calculateEstimatedCost(
            updated.volume,
            updated.weight,
            (property === "printType" ? value : updated.printType) as PrintType,
            property === "material" ? value : updated.material,
            property === "finish" ? value : updated.finish,
            property === "quantity" ? value : updated.quantity,
          );
        }
        return updated;
      }),
    );
  };

  const recalculateAllCosts = () => {
    setUploadedFiles((prev) =>
      prev.map((file) => ({
        ...file,
        estimatedCost: calculateEstimatedCost(
          file.volume,
          file.weight,
          (file.printType as PrintType) || "sla",
          file.material,
          file.finish,
          file.quantity,
        ),
      })),
    );
  };

  const updateGlobalFileSettings = (
    newPrintType: string,
    newMaterial: string,
    newFinish: string
  ) => {
    setUploadedFiles((prev) =>
      prev.map((file) => {
        // Only update if changes are needed to avoid unnecessary recalculations if checked strictly
        // But for batch, we just overwrite to ensure consistency

        const weight = calculateWeight(
          file.volume,
          newPrintType as PrintType,
          newMaterial
        );

        const estimatedCost = calculateEstimatedCost(
          file.volume,
          weight,
          newPrintType as PrintType,
          newMaterial,
          newFinish,
          file.quantity
        );

        return {
          ...file,
          printType: newPrintType,
          material: newMaterial,
          finish: newFinish,
          weight,
          estimatedCost
        };
      })
    );
  };

  return {
    uploadedFiles,
    setUploadedFiles,
    handleFileUpload,
    removeFile,
    updateFileProperty,
    recalculateAllCosts,
    updateGlobalFileSettings,
  };
}
