import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Plus,
  Edit,
  Save,
  X,
  ArrowLeft,
  Settings,
  Upload,
  FileText,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface Material {
  value: string;
  label: string;
  density: number;
  pricePerGram: number;
}

interface MaterialsByType {
  fdm: Material[];
  sla: Material[];
  metal: Material[];
}

const INITIAL_MATERIALS: MaterialsByType = {
  fdm: [
    { value: "pla", label: "PLA", density: 1.24, pricePerGram: 8 },
    { value: "abs", label: "ABS", density: 1.175, pricePerGram: 12 },
    { value: "petg", label: "PETG", density: 1.27, pricePerGram: 15 },
  ],
  sla: [
    { value: "abs_alike", label: "ABS Alike", density: 1.1, pricePerGram: 12 },
    {
      value: "clear_transparent",
      label: "Clear Transparent",
      density: 1.05,
      pricePerGram: 12,
    },
    {
      value: "black_8k_brittle",
      label: "Black 8K Brittle",
      density: 1.15,
      pricePerGram: 12,
    },
  ],
  metal: [
    {
      value: "stainless_steel",
      label: "Stainless Steel",
      density: 7.9,
      pricePerGram: 180,
    },
    { value: "aluminum", label: "Aluminum", density: 2.7, pricePerGram: 120 },
    { value: "titanium", label: "Titanium", density: 4.5, pricePerGram: 850 },
  ],
};

interface NewMaterial {
  value: string;
  label: string;
  density: string;
  pricePerGram: string;
  printType: string;
}

interface MinimumPriceSettings {
  enabled: boolean;
  amount: number;
}

interface DiscountSettings {
  enabled: boolean;
  percentage: number;
}

interface VolumeDiscountSlab {
  id: string;
  minVolume: number;
  discount: number;
  label: string;
}

export default function Admin() {
  const { user, isAuthenticated, signOut } = useAuth();
  const [materials, setMaterials] =
    useState<MaterialsByType>(INITIAL_MATERIALS);
  const [editingMaterial, setEditingMaterial] = useState<{
    printType: string;
    index: number;
    material: Material;
  } | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMaterial, setNewMaterial] = useState<NewMaterial>({
    value: "",
    label: "",
    density: "",
    pricePerGram: "",
    printType: "fdm",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Minimum price settings
  const [minimumPriceSettings, setMinimumPriceSettings] =
    useState<MinimumPriceSettings>(() => {
      const saved = localStorage.getItem("minimumPriceSettings");
      return saved ? JSON.parse(saved) : { enabled: true, amount: 200 };
    });

  // Discount settings
  const [discountSettings, setDiscountSettings] = useState<DiscountSettings>(
    () => {
      const saved = localStorage.getItem("discountSettings");
      return saved ? JSON.parse(saved) : { enabled: false, percentage: 0 };
    },
  );

  interface BankDetails {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    swiftCode: string;
    bankName: string;
    branchName: string;
  }

  const [bankDetails, setBankDetails] = useState<BankDetails>(() => {
    const saved = localStorage.getItem("bankDetails");
    return saved
      ? JSON.parse(saved)
      : {
        accountName: "Protoforgelabs Private Limited",
        accountNumber: "12345678910",
        ifscCode: "HDFC0000123",
        swiftCode: "HDFCIXXX",
        bankName: "HDFC BANK LTD",
        branchName: "BANGALORE - MAHADEVAPURA",
      };
  });

  // Volume discount slabs
  const [volumeDiscountSlabs, setVolumeDiscountSlabs] = useState<
    VolumeDiscountSlab[]
  >(() => {
    const saved = localStorage.getItem("volumeDiscountSlabs");
    return saved
      ? JSON.parse(saved)
      : [
        { id: "1", minVolume: 2000, discount: 5, label: "Large Order" },
        { id: "2", minVolume: 4000, discount: 10, label: "Bulk Order" },
        { id: "3", minVolume: 8000, discount: 15, label: "Enterprise Order" },
      ];
  });

  const [newSlab, setNewSlab] = useState<Omit<VolumeDiscountSlab, "id">>({
    minVolume: 0,
    discount: 0,
    label: "",
  });

  // Check if user is admin
  const isAdmin = isAuthenticated && user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Admin Access Required</CardTitle>
            <CardDescription>
              Please sign in with admin credentials to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link to="/signin">
              <Button className="w-full">Sign In</Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validateMaterial = (material: NewMaterial): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!material.value.trim()) newErrors.value = "Material ID is required";
    if (!material.label.trim()) newErrors.label = "Material name is required";
    if (
      !material.density ||
      isNaN(parseFloat(material.density)) ||
      parseFloat(material.density) <= 0
    ) {
      newErrors.density = "Valid density is required";
    }
    if (
      !material.pricePerGram ||
      isNaN(parseFloat(material.pricePerGram)) ||
      parseFloat(material.pricePerGram) <= 0
    ) {
      newErrors.pricePerGram = "Valid price is required";
    }

    // Check for duplicate material IDs
    const existingMaterial = materials[
      material.printType as keyof MaterialsByType
    ]?.find((m) => m.value === material.value);
    if (existingMaterial) {
      newErrors.value = "Material ID already exists";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddMaterial = () => {
    if (!validateMaterial(newMaterial)) return;

    const materialToAdd: Material = {
      value: newMaterial.value,
      label: newMaterial.label,
      density: parseFloat(newMaterial.density),
      pricePerGram: parseFloat(newMaterial.pricePerGram),
    };

    setMaterials((prev) => ({
      ...prev,
      [newMaterial.printType]: [
        ...prev[newMaterial.printType as keyof MaterialsByType],
        materialToAdd,
      ],
    }));

    setNewMaterial({
      value: "",
      label: "",
      density: "",
      pricePerGram: "",
      printType: "fdm",
    });
    setShowAddDialog(false);
    setErrors({});
  };

  const handleDeleteMaterial = (printType: string, index: number) => {
    if (confirm("Are you sure you want to delete this material?")) {
      setMaterials((prev) => ({
        ...prev,
        [printType]: prev[printType as keyof MaterialsByType].filter(
          (_, i) => i !== index,
        ),
      }));
    }
  };

  const handleEditMaterial = (
    printType: string,
    index: number,
    material: Material,
  ) => {
    setEditingMaterial({ printType, index, material: { ...material } });
  };

  const handleSaveEdit = () => {
    if (!editingMaterial) return;

    const { printType, index, material } = editingMaterial;

    if (material.density <= 0 || material.pricePerGram <= 0) {
      alert("Density and price must be greater than 0");
      return;
    }

    setMaterials((prev) => ({
      ...prev,
      [printType]: prev[printType as keyof MaterialsByType].map((m, i) =>
        i === index ? material : m,
      ),
    }));

    setEditingMaterial(null);
  };

  const handleCancelEdit = () => {
    setEditingMaterial(null);
  };

  const handleMinimumPriceUpdate = (settings: MinimumPriceSettings) => {
    setMinimumPriceSettings(settings);
    localStorage.setItem("minimumPriceSettings", JSON.stringify(settings));
  };

  const handleDiscountUpdate = (settings: DiscountSettings) => {
    setDiscountSettings(settings);
    localStorage.setItem("discountSettings", JSON.stringify(settings));
  };

  const handleVolumeSlabsUpdate = (slabs: VolumeDiscountSlab[]) => {
    setVolumeDiscountSlabs(slabs);
    localStorage.setItem("volumeDiscountSlabs", JSON.stringify(slabs));
  };

  const handleSaveBankDetails = () => {
    localStorage.setItem("bankDetails", JSON.stringify(bankDetails));
    alert("Bank details saved successfully!");
  };

  const addVolumeSlab = () => {
    if (newSlab.minVolume > 0 && newSlab.discount > 0 && newSlab.label.trim()) {
      const newSlabWithId = {
        ...newSlab,
        id: Date.now().toString(),
      };
      const updatedSlabs = [...volumeDiscountSlabs, newSlabWithId].sort(
        (a, b) => a.minVolume - b.minVolume,
      );
      handleVolumeSlabsUpdate(updatedSlabs);
      setNewSlab({ minVolume: 0, discount: 0, label: "" });
    }
  };

  const removeVolumeSlab = (id: string) => {
    const updatedSlabs = volumeDiscountSlabs.filter((slab) => slab.id !== id);
    handleVolumeSlabsUpdate(updatedSlabs);
  };

  const updateVolumeSlab = (
    id: string,
    field: keyof Omit<VolumeDiscountSlab, "id">,
    value: any,
  ) => {
    const updatedSlabs = volumeDiscountSlabs.map((slab) =>
      slab.id === id ? { ...slab, [field]: value } : slab,
    );
    handleVolumeSlabsUpdate(updatedSlabs);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#FF5722] rounded-none flex items-center justify-center">
                  <span className="text-white font-bold text-sm font-mono">3D</span>
                </div>
                <span className="text-xl font-bold text-gray-900 font-mono tracking-tighter uppercase">
                  ProtoFast
                </span>
              </Link>
              <Badge
                variant="secondary"
                className="bg-orange-50 text-[#FF5722] border border-orange-100 rounded-none font-mono uppercase tracking-widest text-[10px]"
              >
                <Settings className="w-3 h-3 mr-1" />
                Admin Panel
              </Badge>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 font-mono uppercase hidden md:inline">
                Welcome, <span className="font-bold text-gray-900">{user?.fullName}</span>
              </span>
              <Link to="/client-quotations">
                <Button variant="outline" size="sm" className="rounded-none font-mono uppercase font-bold tracking-wider text-xs border-gray-300">
                  <FileText className="w-4 h-4 mr-2" />
                  Quotations
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" size="sm" className="rounded-none font-mono uppercase font-bold tracking-wider text-xs border-gray-300">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
              <Button
                onClick={signOut}
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-none font-mono uppercase font-bold tracking-wider text-xs"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 font-mono uppercase tracking-tighter">
            Material & Pricing Management
          </h1>
          <p className="text-gray-600 font-mono text-xs uppercase tracking-wide">
            Manage 3D printing materials, densities, and pricing for your quotation system.
          </p>
        </div>

        {/* Materials Management */}
        <div className="grid gap-8">
          {Object.entries(materials).map(([printType, materialList]) => (
            <Card key={printType} className="rounded-none border-gray-200 shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="capitalize font-mono uppercase tracking-widest font-bold text-lg">
                      {printType} Materials
                    </CardTitle>
                    <CardDescription className="font-mono text-xs uppercase tracking-wide text-gray-400">
                      Manage {printType.toUpperCase()} printing materials and
                      pricing
                    </CardDescription>
                  </div>
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() =>
                          setNewMaterial((prev) => ({ ...prev, printType }))
                        }
                        className="rounded-none font-mono uppercase font-bold tracking-wider text-xs bg-[#FF5722] hover:bg-[#F4511E] text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Material
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-none border-2 border-gray-900">
                      <DialogHeader>
                        <DialogTitle className="font-mono uppercase tracking-widest font-bold">
                          Add New {printType.toUpperCase()} Material
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="materialId" className="font-bold uppercase tracking-wider text-xs font-mono">Material ID</Label>
                          <Input
                            id="materialId"
                            value={newMaterial.value}
                            onChange={(e) =>
                              setNewMaterial((prev) => ({
                                ...prev,
                                value: e.target.value,
                              }))
                            }
                            placeholder="e.g., pla_plus"
                            className={cn("rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]", errors.value && "border-red-500")}
                          />
                          {errors.value && (
                            <p className="text-red-500 text-sm font-mono">
                              {errors.value}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="materialName" className="font-bold uppercase tracking-wider text-xs font-mono">Material Name</Label>
                          <Input
                            id="materialName"
                            value={newMaterial.label}
                            onChange={(e) =>
                              setNewMaterial((prev) => ({
                                ...prev,
                                label: e.target.value,
                              }))
                            }
                            placeholder="e.g., PLA Plus"
                            className={cn("rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]", errors.label && "border-red-500")}
                          />
                          {errors.label && (
                            <p className="text-red-500 text-sm font-mono">
                              {errors.label}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="density" className="font-bold uppercase tracking-wider text-xs font-mono">Density (g/cm³)</Label>
                          <Input
                            id="density"
                            type="number"
                            step="0.01"
                            value={newMaterial.density}
                            onChange={(e) =>
                              setNewMaterial((prev) => ({
                                ...prev,
                                density: e.target.value,
                              }))
                            }
                            placeholder="e.g., 1.24"
                            className={cn("rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]", errors.density && "border-red-500")}
                          />
                          {errors.density && (
                            <p className="text-red-500 text-sm font-mono">
                              {errors.density}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="price" className="font-bold uppercase tracking-wider text-xs font-mono">Price per Gram (₹)</Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={newMaterial.pricePerGram}
                            onChange={(e) =>
                              setNewMaterial((prev) => ({
                                ...prev,
                                pricePerGram: e.target.value,
                              }))
                            }
                            placeholder="e.g., 12"
                            className={cn(
                              "rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]",
                              errors.pricePerGram && "border-red-500",
                            )}
                          />
                          {errors.pricePerGram && (
                            <p className="text-red-500 text-sm font-mono">
                              {errors.pricePerGram}
                            </p>
                          )}
                        </div>

                        <div className="flex space-x-2 pt-4">
                          <Button
                            onClick={handleAddMaterial}
                            className="flex-1 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-none font-mono uppercase font-bold tracking-widest shadow-md"
                          >
                            Add Material
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowAddDialog(false)}
                            className="flex-1 rounded-none font-mono uppercase font-bold tracking-widest border-2 border-gray-200 hover:border-gray-900 hover:bg-transparent"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-3 px-2 font-mono uppercase tracking-wider text-xs text-gray-500 font-bold">
                          Material
                        </th>
                        <th className="text-left py-3 px-2 font-mono uppercase tracking-wider text-xs text-gray-500 font-bold">
                          Density (g/cm³)
                        </th>
                        <th className="text-left py-3 px-2 font-mono uppercase tracking-wider text-xs text-gray-500 font-bold">
                          Price (₹/g)
                        </th>
                        <th className="text-left py-3 px-2 font-mono uppercase tracking-wider text-xs text-gray-500 font-bold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialList.map((material, index) => (
                        <tr
                          key={material.value}
                          className="border-b border-gray-100 font-mono text-sm hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-2">
                            <div>
                              <div className="font-bold text-gray-900 uppercase">
                                {material.label}
                              </div>
                              <div className="text-xs text-gray-500">
                                {material.value}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            {editingMaterial?.printType === printType &&
                              editingMaterial?.index === index ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={editingMaterial.material.density}
                                onChange={(e) =>
                                  setEditingMaterial((prev) =>
                                    prev
                                      ? {
                                        ...prev,
                                        material: {
                                          ...prev.material,
                                          density:
                                            parseFloat(e.target.value) || 0,
                                        },
                                      }
                                      : null,
                                  )
                                }
                                className="w-24 rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]"
                              />
                            ) : (
                              material.density
                            )}
                          </td>
                          <td className="py-4 px-2">
                            {editingMaterial?.printType === printType &&
                              editingMaterial?.index === index ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={editingMaterial.material.pricePerGram}
                                onChange={(e) =>
                                  setEditingMaterial((prev) =>
                                    prev
                                      ? {
                                        ...prev,
                                        material: {
                                          ...prev.material,
                                          pricePerGram:
                                            parseFloat(e.target.value) || 0,
                                        },
                                      }
                                      : null,
                                  )
                                }
                                className="w-24 rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]"
                              />
                            ) : (
                              `₹${material.pricePerGram}`
                            )}
                          </td>
                          <td className="py-4 px-2">
                            <div className="flex space-x-2">
                              {editingMaterial?.printType === printType &&
                                editingMaterial?.index === index ? (
                                <>
                                  <Button size="sm" onClick={handleSaveEdit} className="bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-none w-8 h-8 p-0 shadow-sm">
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                    className="rounded-none border border-gray-300 hover:border-gray-900 w-8 h-8 p-0"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleEditMaterial(
                                        printType,
                                        index,
                                        material,
                                      )
                                    }
                                    className="rounded-none border border-gray-300 hover:border-[#FF5722] hover:text-[#FF5722] w-8 h-8 p-0"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleDeleteMaterial(printType, index)
                                    }
                                    className="rounded-none border border-gray-300 text-red-500 hover:bg-red-50 hover:border-red-500 w-8 h-8 p-0"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pricing Configuration */}
        <Card className="mt-8 rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="font-mono uppercase tracking-widest font-bold">Pricing Configuration</CardTitle>
            <CardDescription className="font-mono text-xs uppercase tracking-wide text-gray-400">
              Configure pricing rules, minimum charges, and cost calculation
              settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Minimum Price Settings */}
              <div className="space-y-4">
                <h4 className="font-mono uppercase tracking-wider font-bold text-sm text-gray-900">
                  Minimum Price Control
                </h4>

                <div className="space-y-4 p-4 border border-gray-200 rounded-none bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="minimumPriceEnabled"
                        checked={minimumPriceSettings.enabled}
                        onChange={(e) =>
                          handleMinimumPriceUpdate({
                            ...minimumPriceSettings,
                            enabled: e.target.checked,
                          })
                        }
                        className="rounded-none text-[#FF5722] focus:ring-[#FF5722]"
                      />
                      <Label
                        htmlFor="minimumPriceEnabled"
                        className="font-mono uppercase tracking-wider text-xs font-bold"
                      >
                        Enable minimum price
                      </Label>
                    </div>
                    <Badge
                      variant={
                        minimumPriceSettings.enabled ? "default" : "secondary"
                      }
                      className={cn(
                        "rounded-none font-mono uppercase tracking-widest text-[10px]",
                        minimumPriceSettings.enabled ? "bg-[#FF5722] hover:bg-[#F4511E]" : "bg-gray-100 text-gray-500"
                      )}
                    >
                      {minimumPriceSettings.enabled ? "ON" : "OFF"}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minimumAmount" className="font-mono uppercase tracking-wider text-xs font-bold">Minimum Amount (₹)</Label>
                    <Input
                      id="minimumAmount"
                      type="number"
                      value={minimumPriceSettings.amount}
                      onChange={(e) =>
                        handleMinimumPriceUpdate({
                          ...minimumPriceSettings,
                          amount: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={!minimumPriceSettings.enabled}
                      className={cn(
                        "rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]",
                        !minimumPriceSettings.enabled && "opacity-50",
                      )}
                    />
                  </div>

                  <div className="text-xs text-gray-500 font-mono">
                    {minimumPriceSettings.enabled ? (
                      <>
                        If calculated cost is less than ₹
                        {minimumPriceSettings.amount}, minimum amount charged.
                      </>
                    ) : (
                      <>
                        Cost is calculated exactly based on part weight.
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Tax Configuration */}
              <div className="space-y-4">
                <h4 className="font-mono uppercase tracking-wider font-bold text-sm text-gray-900">Tax Configuration</h4>
                <div className="space-y-3 font-mono text-sm border border-gray-200 p-4 rounded-none bg-gray-50/50">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 uppercase text-xs">CGST rate:</span>
                    <span className="font-bold">9%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 uppercase text-xs">SGST rate:</span>
                    <span className="font-bold">9%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 uppercase text-xs">IGST rate:</span>
                    <span className="font-bold">18%</span>
                  </div>
                </div>
              </div>

              {/* Calculation Rules */}
              <div className="space-y-4">
                <h4 className="font-mono uppercase tracking-wider font-bold text-sm text-gray-900">Calculation Rules</h4>
                <div className="space-y-3 border border-gray-200 p-4 rounded-none bg-gray-50/50">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-mono uppercase text-xs">Formula:</span>
                    <span className="font-bold font-mono text-xs">
                      Weight × Price/g × Finish × Qty
                    </span>
                  </div>
                  <div className="space-y-1 mt-2">
                    <span className="text-gray-600 text-xs font-mono uppercase">
                      Finish multipliers:
                    </span>
                    <div className="text-xs font-mono space-y-1 mt-1 font-bold text-gray-700">
                      <div>Standard: 1.0x</div>
                      <div>Smooth: 1.3x</div>
                      <div>Painted: 1.8x</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Discount Management */}
        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="font-mono uppercase tracking-widest font-bold">Discount Management</CardTitle>
            <CardDescription className="font-mono text-xs uppercase tracking-wide text-gray-400">
              Configure discount percentages and volume-based discount slabs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Regular Discount Settings */}
              <div className="space-y-4">
                <h4 className="font-mono uppercase tracking-wider font-bold text-sm text-gray-900">Regular Discount</h4>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="discountEnabled"
                      checked={discountSettings.enabled}
                      onChange={(e) =>
                        handleDiscountUpdate({
                          ...discountSettings,
                          enabled: e.target.checked,
                        })
                      }
                      className="rounded-none text-[#FF5722] focus:ring-[#FF5722]"
                    />
                    <Label htmlFor="discountEnabled" className="font-mono uppercase tracking-wider text-xs font-bold">
                      Enable Regular Discount
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="discountPercentage" className="font-mono uppercase tracking-wider text-xs font-bold">Discount %:</Label>
                    <Input
                      id="discountPercentage"
                      type="number"
                      min="0"
                      max="50"
                      step="0.1"
                      value={discountSettings.percentage}
                      onChange={(e) =>
                        handleDiscountUpdate({
                          ...discountSettings,
                          percentage: parseFloat(e.target.value) || 0,
                        })
                      }
                      disabled={!discountSettings.enabled}
                      className="w-24 rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]"
                    />
                  </div>
                </div>
              </div>

              {/* Volume Discount Slabs */}
              <div className="space-y-4">
                <h4 className="font-mono uppercase tracking-wider font-bold text-sm text-gray-900">
                  Volume Discount Slabs
                </h4>
                <p className="text-xs text-gray-500 font-mono">
                  Set discount percentages based on total order volume (cm³).
                  Higher volume orders get better discounts.
                </p>

                {/* Existing Slabs */}
                <div className="space-y-3">
                  {volumeDiscountSlabs.map((slab) => (
                    <div
                      key={slab.id}
                      className="flex items-center space-x-3 p-3 border border-gray-200 rounded-none bg-gray-50"
                    >
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <div>
                          <Label className="uppercase tracking-wider text-[10px] font-bold font-mono text-gray-500">Min Volume (cm³)</Label>
                          <Input
                            type="number"
                            value={slab.minVolume}
                            onChange={(e) =>
                              updateVolumeSlab(
                                slab.id,
                                "minVolume",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="h-8 rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]"
                          />
                        </div>
                        <div>
                          <Label className="uppercase tracking-wider text-[10px] font-bold font-mono text-gray-500">Discount %</Label>
                          <Input
                            type="number"
                            min="0"
                            max="50"
                            step="0.1"
                            value={slab.discount}
                            onChange={(e) =>
                              updateVolumeSlab(
                                slab.id,
                                "discount",
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className="h-8 rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]"
                          />
                        </div>
                        <div>
                          <Label className="uppercase tracking-wider text-[10px] font-bold font-mono text-gray-500">Label</Label>
                          <Input
                            value={slab.label}
                            onChange={(e) =>
                              updateVolumeSlab(slab.id, "label", e.target.value)
                            }
                            className="h-8 rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]"
                          />
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeVolumeSlab(slab.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-none border-gray-300 h-8 w-8 p-0 flex items-center justify-center mt-4"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add New Slab */}
                <div className="p-4 border-2 border-dashed border-gray-300 rounded-none">
                  <h5 className="font-mono uppercase tracking-wider font-bold text-xs mb-3 text-gray-700">
                    Add New Volume Slab
                  </h5>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <Label className="uppercase tracking-wider text-[10px] font-bold font-mono text-gray-500">Min Volume (cm³)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 5000"
                        value={newSlab.minVolume || ""}
                        onChange={(e) =>
                          setNewSlab((prev) => ({
                            ...prev,
                            minVolume: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="h-9 rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]"
                      />
                    </div>
                    <div>
                      <Label className="uppercase tracking-wider text-[10px] font-bold font-mono text-gray-500">Discount %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        step="0.1"
                        placeholder="e.g., 12"
                        value={newSlab.discount || ""}
                        onChange={(e) =>
                          setNewSlab((prev) => ({
                            ...prev,
                            discount: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="h-9 rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]"
                      />
                    </div>
                    <div>
                      <Label className="uppercase tracking-wider text-[10px] font-bold font-mono text-gray-500">Label</Label>
                      <Input
                        placeholder="e.g., Premium Order"
                        value={newSlab.label}
                        onChange={(e) =>
                          setNewSlab((prev) => ({
                            ...prev,
                            label: e.target.value,
                          }))
                        }
                        className="h-9 rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={addVolumeSlab}
                    disabled={
                      !newSlab.minVolume ||
                      !newSlab.discount ||
                      !newSlab.label.trim()
                    }
                    size="sm"
                    className="w-full bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-none font-mono uppercase font-bold tracking-widest"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Slab
                  </Button>
                </div>

                {/* Volume Slab Preview */}
                {volumeDiscountSlabs.length > 0 && (
                  <div className="p-3 bg-orange-50/50 border border-orange-100 rounded-none">
                    <h5 className="font-mono uppercase tracking-wider font-bold text-xs mb-2 text-[#FF5722]">
                      Current Discount Structure
                    </h5>
                    <div className="text-xs space-y-1 font-mono text-gray-600">
                      {volumeDiscountSlabs
                        .sort((a, b) => a.minVolume - b.minVolume)
                        .map((slab, index) => (
                          <div key={slab.id} className="flex justify-between">
                            <span>
                              {slab.minVolume.toLocaleString()} cm³+ :
                            </span>
                            <span className="font-bold">
                              {slab.discount}% OFF ({slab.label})
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Logo and Branding */}
        {/* Company Logo and Branding */}
        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="font-mono uppercase tracking-widest font-bold">Company Branding</CardTitle>
            <CardDescription className="font-mono text-xs uppercase tracking-wide text-gray-400">
              Manage company logo and branding for quotations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-mono uppercase tracking-wider font-bold text-sm text-gray-900">Company Logo</h4>
                <div className="border-2 border-dashed border-gray-300 rounded-none p-6 text-center hover:bg-gray-50 transition-colors">
                  <div className="text-gray-600 mb-4 font-mono text-xs">
                    Upload company logo for quotations (PNG, JPG, SVG;
                    recommended 400×120px)
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        try {
                          localStorage.setItem(
                            "company.logo",
                            String(reader.result),
                          );
                          alert(
                            "Logo saved. New quotations will show the updated logo.",
                          );
                        } catch { }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="block mx-auto font-mono text-sm"
                  />
                  <div className="mt-4">
                    {(() => {
                      const logo = localStorage.getItem("company.logo");
                      return logo ? (
                        <img
                          src={logo}
                          alt="Company Logo"
                          className="mx-auto"
                          style={{
                            maxWidth: 200,
                            maxHeight: 80,
                            objectFit: "contain",
                          }}
                        />
                      ) : (
                        <div className="text-gray-400 font-mono text-xs uppercase tracking-widest">No logo uploaded</div>
                      );
                    })()}
                  </div>
                  <div className="mt-3 space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        localStorage.removeItem("company.logo");
                        alert("Logo removed");
                      }}
                      className="rounded-none font-mono uppercase font-bold tracking-widest text-xs border-gray-300 hover:border-red-500 hover:text-red-500"
                    >
                      Remove Logo
                    </Button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 font-mono uppercase">
                    Recommended: PNG/JPG/SVG, 400×120px. Max display: 120×60px.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-mono uppercase tracking-wider font-bold text-sm text-gray-900">
                  Additional Charges
                </h4>
                <div className="p-4 border border-gray-200 rounded-none flex items-center justify-between bg-white">
                  <div>
                    <div className="font-bold font-mono text-sm text-gray-900 uppercase tracking-wide">
                      Include Packaging & Courier
                    </div>
                    <div className="text-xs text-gray-500 font-mono mt-1">
                      When OFF, shipping charges shown as “at actual”.
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      defaultChecked={JSON.parse(
                        localStorage.getItem("additionalChargesEnabled") ||
                        "true",
                      )}
                      onChange={(e) =>
                        localStorage.setItem(
                          "additionalChargesEnabled",
                          JSON.stringify(e.target.checked),
                        )
                      }
                      className="rounded-none text-[#FF5722] focus:ring-[#FF5722]"
                    />
                    <span className="text-sm text-gray-700 font-mono uppercase font-bold">Toggle</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Details Management */}
        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="font-mono uppercase tracking-widest font-bold">Bank Transfer Details</CardTitle>
            <CardDescription className="font-mono text-xs uppercase tracking-wide text-gray-400">
              Manage bank account details that appear on quotations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accountName" className="font-mono uppercase tracking-wider text-xs font-bold">Account Name</Label>
                  <Input
                    id="accountName"
                    value={bankDetails.accountName}
                    onChange={(e) => setBankDetails(prev => ({ ...prev, accountName: e.target.value }))}
                    placeholder="Enter account holder name"
                    className="rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber" className="font-mono uppercase tracking-wider text-xs font-bold">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="Enter account number"
                    className="rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ifscCode" className="font-mono uppercase tracking-wider text-xs font-bold">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    value={bankDetails.ifscCode}
                    onChange={(e) => setBankDetails(prev => ({ ...prev, ifscCode: e.target.value }))}
                    placeholder="Enter IFSC code"
                    className="rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="swiftCode" className="font-mono uppercase tracking-wider text-xs font-bold">Swift Code</Label>
                  <Input
                    id="swiftCode"
                    value={bankDetails.swiftCode}
                    onChange={(e) => setBankDetails(prev => ({ ...prev, swiftCode: e.target.value }))}
                    placeholder="Enter Swift code"
                    className="rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName" className="font-mono uppercase tracking-wider text-xs font-bold">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails(prev => ({ ...prev, bankName: e.target.value }))}
                    placeholder="Enter bank name"
                    className="rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branchName" className="font-mono uppercase tracking-wider text-xs font-bold">Branch Name</Label>
                  <Input
                    id="branchName"
                    value={bankDetails.branchName}
                    onChange={(e) => setBankDetails(prev => ({ ...prev, branchName: e.target.value }))}
                    placeholder="Enter branch name"
                    className="rounded-none border-gray-300 focus:ring-0 focus:border-[#FF5722]"
                  />
                </div>
              </div>

              <div className="md:col-span-2 pt-4 border-t border-gray-100">
                <Button
                  onClick={handleSaveBankDetails}
                  className="bg-green-600 hover:bg-green-700 w-full md:w-auto rounded-none font-mono uppercase font-bold tracking-widest shadow-sm"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Bank Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
