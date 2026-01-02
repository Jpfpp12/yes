import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, UploadCloud } from "lucide-react";
import { useFileUpload, UploadedFile } from "@/hooks/useFileUpload";
import FileUploadArea from "@/components/FileUploadArea";
import FileTable from "@/components/FileTable";
import { OptionSelector } from "@/components/QuotePage/OptionSelector";
import { createRazorpayOrder, loadRazorpay } from "@/utils/razorpay";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import ClientInfoForm from "@/components/ClientInfoForm";
import { PRINT_TYPES, MATERIALS, FINISHES } from "@/lib/printing";

// Mappings
const MATERIAL_MAPPING: Record<string, { printType: string; material: string }> = {
    pla: { printType: "fdm", material: "pla" },
    abs: { printType: "fdm", material: "abs" },
    petg: { printType: "fdm", material: "petg" },
    resin: { printType: "sla", material: "abs_alike" },
};

const QUALITY_MAPPING: Record<string, string> = {
    draft: "standard",
    standard: "smooth",
    high: "painted",
};

export default function Quote() {
    const { user } = useAuth();
    const { uploadedFiles, handleFileUpload, updateFileProperty, removeFile } = useFileUpload();

    // Global settings for the quote page style
    const [selectedMaterial, setSelectedMaterial] = useState("pla");
    const [selectedQuality, setSelectedQuality] = useState("standard");

    // Dialog for User details
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [clientInfo, setClientInfo] = useState({
        name: user?.fullName || "",
        email: user?.email || "",
        phone: "",
        gstNumber: "",
        billingAddress: "",
        shippingAddress: "",
        sameAsbilling: true,
    });
    const [quotationCharges, setQuotationCharges] = useState({
        cgst: 9,
        sgst: 9,
        igst: 0,
        packagingCharges: 50,
        courierCharges: 100,
    });

    // Effect: Update all files when global settings change
    useEffect(() => {
        const matConfig = MATERIAL_MAPPING[selectedMaterial];
        const finish = QUALITY_MAPPING[selectedQuality];

        uploadedFiles.forEach(file => {
            if (file.printType !== matConfig.printType || file.material !== matConfig.material) {
                updateFileProperty(file.id, "printType", matConfig.printType);
                // Delay material update slightly to ensure printType is set (though state batching might handle it)
                // A safer way would be to update both efficiently, but this works for now.
                setTimeout(() => updateFileProperty(file.id, "material", matConfig.material), 0);
            }
            if (file.finish !== finish) {
                updateFileProperty(file.id, "finish", finish);
            }
        });
    }, [selectedMaterial, selectedQuality, uploadedFiles.length]);

    // Total Cost Calculation
    const totalCost = useMemo(() => {
        const subtotal = uploadedFiles.reduce((sum, file) => sum + file.estimatedCost, 0);
        const taxableValue = subtotal + quotationCharges.packagingCharges + quotationCharges.courierCharges;
        const taxAmount = (taxableValue * (quotationCharges.cgst + quotationCharges.sgst + quotationCharges.igst)) / 100;
        return Math.round(taxableValue + taxAmount);
    }, [uploadedFiles, quotationCharges]);


    const handlePayment = async () => {
        const isLoaded = await loadRazorpay();
        if (!isLoaded) {
            toast.error("Razorpay SDK failed to load");
            return;
        }

        const order = await createRazorpayOrder(totalCost * 100); // Amount in paise
        if (!order) {
            toast.error("Failed to create order");
            return;
        }

        const options = {
            key: "rzp_test_DIYK2222222222", // Replace with env variable in prod
            amount: order.amount,
            currency: order.currency,
            name: "FUSION 3D",
            description: "3D Print Quote Payment",
            order_id: order.id,
            handler: async function (response: any) {
                toast.success(`Payment Successful! Payment ID: ${response.razorpay_payment_id}`);
                setShowDetailsDialog(false);
            },
            prefill: {
                name: clientInfo.name,
                email: clientInfo.email,
                contact: clientInfo.phone,
            },
            theme: {
                color: "#F97316",
            },
        };

        const paymentObject = new (window as any).Razorpay(options);
        paymentObject.open();
    };

    const handleGenerateQuoteClick = () => {
        if (uploadedFiles.length === 0) {
            toast.error("Please upload at least one file.");
            return;
        }
        setShowDetailsDialog(true);
    }

    return (
        <div className="min-h-screen bg-white text-black font-sans">
            {/* Header */}
            <header className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                <Link to="/" className="flex items-center text-sm font-bold font-mono uppercase tracking-widest text-gray-500 hover:text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Link>
                <h1 className="text-xl font-bold font-mono uppercase tracking-tighter">
                    3D Print Quote Generator
                </h1>
            </header>

            <main className="grid lg:grid-cols-2 h-[calc(100vh-80px)]">
                {/* Left Column: Upload & Table */}
                <div className="border-r border-gray-100 p-8 flex flex-col gap-8">

                    {/* Top: Upload Area */}
                    <div className="bg-gray-50 border border-gray-200 p-8 flex flex-col items-center justify-center text-center h-[280px]">
                        <div className="w-full h-full" onDragOver={() => { }} onDrop={() => { }}>
                            <FileUploadArea
                                isDragOver={false}
                                onDragOver={(e) => e.preventDefault()}
                                onDragLeave={(e) => e.preventDefault()}
                                onDrop={(e) => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }}
                                onClick={() => document.getElementById("hidden-file-input")?.click()}
                            />
                            <input
                                id="hidden-file-input"
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                            />
                        </div>
                    </div>

                    {/* Bottom: File Table / Grid Preview */}
                    <div className="flex-1 bg-gray-50 border border-gray-200 relative overflow-hidden flex flex-col">
                        {uploadedFiles.length > 0 ? (
                            <div className="p-4 overflow-auto h-full scrollbar-thin scrollbar-thumb-gray-300">
                                <FileTable
                                    uploadedFiles={uploadedFiles}
                                    materials={MATERIALS}
                                    printTypes={PRINT_TYPES as any}
                                    finishes={FINISHES as any}
                                    onUpdateFile={updateFileProperty as any}
                                    onRemoveFile={removeFile}
                                />
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                {/* Simple grid pattern background */}
                                <div className="absolute inset-0" style={{
                                    backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
                                    backgroundSize: '20px 20px',
                                    zIndex: 0
                                }}></div>
                                <span className="relative z-10 font-mono text-gray-300 uppercase tracking-widest text-lg bg-white/80 px-4 py-2">
                                    Upload a file to preview
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Controls */}
                <div className="p-12 flex flex-col justify-center max-w-2xl mx-auto w-full">
                    <div className="space-y-12">

                        <OptionSelector
                            label="Material"
                            selected={selectedMaterial}
                            onChange={setSelectedMaterial}
                            options={[
                                { label: "PLA", value: "pla" },
                                { label: "ABS", value: "abs" },
                                { label: "PETG", value: "petg" },
                                { label: "Resin", value: "resin" },
                            ]}
                        />

                        <OptionSelector
                            label="Quality"
                            selected={selectedQuality}
                            onChange={setSelectedQuality}
                            options={[
                                { label: "DRAFT", value: "draft" },
                                { label: "STANDARD", value: "standard" },
                                { label: "HIGH QUALITY", value: "high" },
                            ]}
                        />

                        <Button
                            onClick={handleGenerateQuoteClick}
                            className="w-full h-14 text-white font-bold font-mono uppercase tracking-widest text-lg rounded-none hover:bg-gray-800 transition-all bg-gray-900"
                        >
                            Generate Quote {totalCost > 0 && `(₹${totalCost})`}
                        </Button>
                    </div>
                </div>
            </main>

            {/* Details Dialog before Payment */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-mono uppercase">Confirm Details</DialogTitle>
                    </DialogHeader>
                    <div className="p-1">
                        <ClientInfoForm
                            clientInfo={clientInfo}
                            quotationCharges={quotationCharges}
                            onClientInfoChange={(k, v) => setClientInfo(prev => ({ ...prev, [k]: v }))}
                            onChargesChange={(k, v) => setQuotationCharges(prev => ({ ...prev, [k]: v }))}
                        />
                        <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
                            <Button onClick={handlePayment} className="w-full md:w-auto h-12 text-lg font-bold bg-primary text-white rounded-none">
                                PAY ₹{totalCost}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
