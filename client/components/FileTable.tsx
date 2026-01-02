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
}

export default function FileTable({
  uploadedFiles,
  materials,
  printTypes,
  finishes,
  onUpdateFile,
  onRemoveFile,
}: FileTableProps) {
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
                <th className="text-left py-3 px-2 font-medium text-gray-700">
                  #
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">
                  File Name
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">
                  Preview
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">
                  Print Type
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">
                  Material
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">
                  Finish
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">
                  Qty
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">
                  Cost
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {uploadedFiles.map((file, index) => (
                <tr key={file.id} className="border-b border-gray-100">
                  <td className="py-4 px-2">{index + 1}</td>
                  <td className="py-4 px-2">
                    <div className="font-medium text-gray-900 truncate max-w-xs">
                      {file.file.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <div className="text-xs text-gray-400">
                      {file.isCalculatingVolume ? (
                        <span className="inline-flex items-center">
                          <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></span>
                          Calculating volume...
                        </span>
                      ) : (
                        <div>
                          <div>
                            {file.volume.toFixed(2)} cm³ ({file.volumeMethod})
                          </div>
                          <div>Weight: {file.weight.toFixed(2)}g</div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <FilePreview file={file} />
                  </td>
                  <td className="py-4 px-2">
                    <Select
                      value={file.printType}
                      onValueChange={(value) =>
                        onUpdateFile(file.id, "printType", value)
                      }
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {printTypes.map((printType) => (
                          <SelectItem
                            key={printType.value}
                            value={printType.value}
                          >
                            {printType.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-4 px-2">
                    <Select
                      value={file.material}
                      onValueChange={(value) =>
                        onUpdateFile(file.id, "material", value)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          materials[file.printType as keyof typeof materials] ||
                          []
                        ).map((material: any) => (
                          <SelectItem
                            key={material.value}
                            value={material.value}
                          >
                            {material.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-4 px-2">
                    <Select
                      value={file.finish}
                      onValueChange={(value) =>
                        onUpdateFile(file.id, "finish", value)
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {finishes.map((finish) => (
                          <SelectItem key={finish.value} value={finish.value}>
                            {finish.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-4 px-2">
                    <Input
                      type="number"
                      min="1"
                      value={file.quantity}
                      onChange={(e) =>
                        onUpdateFile(
                          file.id,
                          "quantity",
                          parseInt(e.target.value) || 1,
                        )
                      }
                      className="w-16"
                    />
                  </td>
                  <td className="py-4 px-2 font-medium">
                    ₹{file.estimatedCost.toLocaleString("en-IN")}
                  </td>
                  <td className="py-4 px-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveFile(file.id)}
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
            <FileCard
              key={file.id}
              file={file}
              index={index}
              materials={materials}
              printTypes={printTypes}
              finishes={finishes}
              onUpdateFile={onUpdateFile}
              onRemoveFile={onRemoveFile}
            />
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

function FileCard({
  file,
  index,
  materials,
  printTypes,
  finishes,
  onUpdateFile,
  onRemoveFile,
}: {
  file: UploadedFile;
  index: number;
  materials: any;
  printTypes: any[];
  finishes: any[];
  onUpdateFile: (id: string, property: keyof UploadedFile, value: any) => void;
  onRemoveFile: (id: string) => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <Badge variant="secondary">#{index + 1}</Badge>
          <div>
            <h4 className="font-medium text-gray-900 truncate max-w-xs">
              {file.file.name}
            </h4>
            <p className="text-sm text-gray-500">
              {(file.file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <p className="text-xs text-gray-400">
              {file.isCalculatingVolume ? (
                <span className="inline-flex items-center">
                  <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></span>
                  Calculating volume...
                </span>
              ) : (
                <span>
                  {file.volume.toFixed(2)} cm³ • {file.weight.toFixed(2)}g (
                  {file.volumeMethod})
                </span>
              )}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemoveFile(file.id)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center space-x-4 mb-4">
        <FilePreview file={file} />

        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Print Type:</span>
            <Select
              value={file.printType}
              onValueChange={(value) =>
                onUpdateFile(file.id, "printType", value)
              }
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {printTypes.map((printType) => (
                  <SelectItem key={printType.value} value={printType.value}>
                    {printType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Material:</span>
            <Select
              value={file.material}
              onValueChange={(value) =>
                onUpdateFile(file.id, "material", value)
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  materials[file.printType as keyof typeof materials] || []
                ).map((material: any) => (
                  <SelectItem key={material.value} value={material.value}>
                    {material.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Finish:</span>
            <Select
              value={file.finish}
              onValueChange={(value) => onUpdateFile(file.id, "finish", value)}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {finishes.map((finish) => (
                  <SelectItem key={finish.value} value={finish.value}>
                    {finish.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Qty:</span>
            <Input
              type="number"
              min="1"
              value={file.quantity}
              onChange={(e) =>
                onUpdateFile(file.id, "quantity", parseInt(e.target.value) || 1)
              }
              className="w-16"
            />
          </div>
        </div>
      </div>

      <div className="text-right">
        <span className="text-lg font-bold text-[#2563eb]">
          ₹{file.estimatedCost.toLocaleString("en-IN")}
        </span>
      </div>
    </Card>
  );
}
