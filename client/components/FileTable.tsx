import React from "react";
import { Trash2, ZoomIn } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ThreeDViewer from "@/components/ThreeDViewer";

interface UploadedFile {
  id: string;
  file: File;
  thumbnail: string;
  previewPath?: string;
  fileType?: "stl" | "gltf" | "unsupported";
  printType: string;
  material: string;
  finish: string;
  quantity: number;
  volume: number;
  weight: number;
  volumeMethod: "calculated" | "estimated";
  estimatedCost: number;
  isCalculatingVolume?: boolean;
}

interface FileTableProps {
  uploadedFiles: UploadedFile[];
  materials: any;
  printTypes: any[];
  finishes: any[];
  onUpdateFile: (id: string, property: keyof UploadedFile, value: any) => void;
  onRemoveFile: (id: string) => void;
  onSelectFile?: (file: UploadedFile) => void;
  selectedFileId?: string | null;
}

export default function FileTable({
  uploadedFiles,
  onRemoveFile,
  onSelectFile,
  selectedFileId,
}: Omit<FileTableProps, "materials" | "printTypes" | "finishes" | "onUpdateFile">) {
  if (uploadedFiles.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uploaded Files</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-700">#</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">File Name</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Preview</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Specs</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Qty</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Cost</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {uploadedFiles.map((file, index) => (
                <tr
                  key={file.id}
                  className={`border-b border-gray-100 cursor-pointer transition-colors ${selectedFileId === file.id ? 'bg-[#FF5722]/10 ring-1 ring-[#FF5722]/30' : 'hover:bg-gray-50'}`}
                  onClick={() => onSelectFile?.(file)}
                >
                  <td className="py-4 px-2">{index + 1}</td>
                  <td className="py-4 px-2">
                    <div className="font-medium text-gray-900 truncate max-w-xs">{file.file.name}</div>
                    <div className="text-sm text-gray-500">{(file.file.size / 1024 / 1024).toFixed(2)} MB</div>
                    <div className="text-xs text-gray-400">
                      {file.volume.toFixed(2)} cm³
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <FilePreview file={file} />
                  </td>
                  <td className="py-4 px-2">
                    <div className="text-sm">
                      <span className="font-bold uppercase">{file.printType}</span>
                      <div className="text-xs text-gray-500">{file.material} • {file.finish}</div>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <span className="font-mono font-bold text-lg">{file.quantity}</span>
                  </td>
                  <td className="py-4 px-2 font-medium">
                    ₹{file.estimatedCost.toLocaleString("en-IN")}
                  </td>
                  <td className="py-4 px-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFile(file.id);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {uploadedFiles.map((file, index) => (
            <div
              key={file.id}
              className={`p-4 rounded-lg border transition-all ${selectedFileId === file.id ? 'border-[#FF5722] bg-[#FF5722]/5 shadow-sm' : 'border-gray-200 bg-white'}`}
              onClick={() => onSelectFile?.(file)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Badge variant={selectedFileId === file.id ? "default" : "secondary"} className={selectedFileId === file.id ? "bg-[#FF5722] hover:bg-[#F4511E]" : ""}>#{index + 1}</Badge>
                  <div className="truncate max-w-[150px] font-medium text-sm">{file.file.name}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(file.id);
                  }}
                  className="h-8 w-8 p-0 text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-4">
                <div className="w-16 h-16 shrink-0">
                  <FilePreview file={file} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Specs:</span>
                    <span className="font-medium uppercase">{file.printType} / {file.material}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Qty:</span>
                    <span className="font-bold">{file.quantity}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-1 border-t border-gray-100 mt-1">
                    <span className="text-gray-500">Cost:</span>
                    <span className="font-bold text-[#FF5722]">₹{file.estimatedCost}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FilePreview({ file }: { file: UploadedFile }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="relative cursor-pointer group">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-lg shadow-sm overflow-hidden border border-gray-200">
            {file.fileType === "stl" || file.fileType === "gltf" ? (
              <ThreeDViewer
                fileUrl={file.previewPath || ""}
                fileName={file.file.name}
                className="w-full h-full"
                isPreview={true}
              />
            ) : (
              <img
                src={file.thumbnail}
                alt={file.file.name}
                className="w-full h-full object-contain hover:scale-105 transition-transform duration-200"
              />
            )}
          </div>
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all">
            <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100" />
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">{file.file.name}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center p-4">
          {file.fileType === "stl" || file.fileType === "gltf" ? (
            <div className="w-full h-[500px] bg-gray-900 rounded-lg">
              <ThreeDViewer
                fileUrl={file.previewPath || ""}
                fileName={file.file.name}
                className="w-full h-full rounded-lg"
              />
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 max-w-full">
              <img
                src={file.thumbnail}
                alt={file.file.name}
                className="max-w-full max-h-[500px] object-contain rounded-lg shadow-lg"
              />
            </div>
          )}
        </div>
        <div className="text-center text-sm text-gray-500 mt-2">
          File size: {(file.file.size / 1024 / 1024).toFixed(2)} MB
          {file.fileType && (
            <span className="ml-2">• Type: {file.fileType.toUpperCase()}</span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


