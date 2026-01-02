import React, { useCallback } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadAreaProps {
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
}

export default function FileUploadArea({
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
}: FileUploadAreaProps) {
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDragOver(e);
    },
    [onDragOver]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDragLeave(e);
    },
    [onDragLeave]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDrop(e);
    },
    [onDrop]
  );

  return (
    <div
      className={cn(
        "group relative w-full h-64 border-2 border-dashed transition-all duration-200 ease-in-out cursor-pointer flex flex-col items-center justify-center",
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-gray-300 hover:border-primary/50 bg-gray-50/50"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={onClick}
    >
      <div className="flex flex-col items-center gap-4 text-center p-4">
        <div className="p-4 rounded-full bg-white border border-gray-100 shadow-sm group-hover:scale-110 transition-transform">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="font-mono text-lg font-bold uppercase tracking-tight text-gray-900">
            Upload STL File
          </h3>
          <p className="text-sm text-gray-500 font-medium">
            DRAG & DROP OR CLICK TO SELECT
          </p>
        </div>
      </div>
    </div>
  );
}
