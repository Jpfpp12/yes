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

  const calculateVolumeFromAPI = async (
    file: File,
  ): Promise<{ volume: number; method: "calculated" | "estimated" }> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/calculate-volume", {
        method: "POST",
        body: formData,
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data: VolumeCalculationResponse = await response.json();
      if (!data.success)
        throw new Error(data.message || "Volume calculation failed");
      const volumeInCm3 = data.volume / 1000;
      return {
        volume: Math.round(volumeInCm3 * 100) / 100,
        method: data.method,
      };
    } catch {
      const estimatedVolumeInCm3 = (file.size / 1024) * 0.045;
      return {
        volume: Math.round(estimatedVolumeInCm3 * 100) / 100,
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
          const { volume, method } = await calculateVolumeFromAPI(file);

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

  return {
    uploadedFiles,
    setUploadedFiles,
    handleFileUpload,
    removeFile,
    updateFileProperty,
    recalculateAllCosts,
  };
}
