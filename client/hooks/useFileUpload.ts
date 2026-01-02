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
    const newFiles: UploadedFile[] = [];
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
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowedTypes.includes(fileExtension)) continue;
      const formData = new FormData();
      formData.append("file", file);
      try {
        const response = await fetch("/api/conversion/upload-3d", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) throw new Error("Upload failed");
        const uploadResult = await response.json();
        let thumbUrl = await generateThumbnail(
          file,
          uploadResult.previewPath,
          uploadResult.fileType,
        );
        try {
          if (thumbUrl.startsWith("data:image")) {
            const saveRes = await fetch("/api/conversion/save-thumbnail", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image: thumbUrl,
                source: uploadResult.originalPath,
              }),
            });
            if (saveRes.ok) {
              const saved = await saveRes.json();
              if (saved && saved.url) thumbUrl = saved.url;
            }
          }
        } catch {}
        const id =
          Date.now().toString() + Math.random().toString(36).substr(2, 9);
        newFiles.push({
          id,
          file,
          thumbnail: thumbUrl,
          previewPath: uploadResult.previewPath,
          fileType: uploadResult.fileType,
          printType: "sla",
          material: "abs_alike",
          finish: "standard",
          quantity: 1,
          volume: 0,
          weight: 0,
          volumeMethod: "estimated",
          estimatedCost: 100,
          isCalculatingVolume: true,
          serverPath: uploadResult.originalPath,
        });
      } catch {
        const thumbnail = await generateThumbnail(file);
        const id =
          Date.now().toString() + Math.random().toString(36).substr(2, 9);
        newFiles.push({
          id,
          file,
          thumbnail,
          fileType: "unsupported",
          printType: "sla",
          material: "abs_alike",
          finish: "standard",
          quantity: 1,
          volume: 0,
          weight: 0,
          volumeMethod: "estimated",
          estimatedCost: 100,
          isCalculatingVolume: true,
        });
      }
    }
    setUploadedFiles((prev) => [...prev, ...newFiles]);

    newFiles.forEach(async (fileObj) => {
      try {
        const { volume, method } = await calculateVolumeFromAPI(fileObj.file);
        const weight = calculateWeight(
          volume,
          (fileObj.printType as PrintType) || "sla",
          fileObj.material,
        );
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === fileObj.id
              ? {
                  ...f,
                  volume,
                  weight,
                  volumeMethod: method,
                  isCalculatingVolume: false,
                  estimatedCost: calculateEstimatedCost(
                    volume,
                    weight,
                    (f.printType as PrintType) || "sla",
                    f.material,
                    f.finish,
                    f.quantity,
                  ),
                }
              : f,
          ),
        );
      } catch {
        const fallbackVolume = (fileObj.file.size / 1024) * 0.045;
        const fallbackWeight = calculateWeight(
          fallbackVolume,
          (fileObj.printType as PrintType) || "sla",
          fileObj.material,
        );
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === fileObj.id
              ? {
                  ...f,
                  isCalculatingVolume: false,
                  volume: fallbackVolume,
                  weight: fallbackWeight,
                  volumeMethod: "estimated",
                  estimatedCost: calculateEstimatedCost(
                    fallbackVolume,
                    fallbackWeight,
                    (f.printType as PrintType) || "sla",
                    f.material,
                    f.finish,
                    f.quantity,
                  ),
                }
              : f,
          ),
        );
      }
    });
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
