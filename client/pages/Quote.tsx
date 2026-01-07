import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, UploadCloud, Settings, Download, Mail, Eye, MousePointer2, Move, Search, X } from "lucide-react";
import { useFileUpload, UploadedFile } from "@/hooks/useFileUpload";
import FileUploadArea from "@/components/FileUploadArea";
import FileTable from "@/components/FileTable";
// import ThreeDViewer from "@/components/ThreeDViewer";
import ThreeDViewer from "@/components/ThreeDViewer";
import { createRazorpayOrder, loadRazorpay } from "@/utils/razorpay";
import { generateQuotePDF } from "@/utils/pdfGenerator";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import ClientInfoForm from "@/components/ClientInfoForm";
import QuotePreview from "@/components/QuotePreview";
import { PRINT_TYPES, MATERIALS, FINISHES } from "@/lib/printing";
import { cn } from "@/lib/utils";

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
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { uploadedFiles, handleFileUpload, updateFileProperty, removeFile, updateGlobalFileSettings } = useFileUpload();

    // Global settings for the quote page style
    const [selectedMaterial, setSelectedMaterial] = useState("pla");
    const [selectedQuality, setSelectedQuality] = useState("standard");

    // Preview State
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

    // Dialog for User details
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [showFullscreenViewer, setShowFullscreenViewer] = useState(false);
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

    // Quote Flow State
    const [quoteStep, setQuoteStep] = useState<'details' | 'preview'>('details');

    // Effect: Update all files when global settings change
    useEffect(() => {
        if (uploadedFiles.length === 0) return;

        const matConfig = MATERIAL_MAPPING[selectedMaterial];
        const finish = QUALITY_MAPPING[selectedQuality];

        updateGlobalFileSettings(matConfig.printType, matConfig.material, finish);
    }, [selectedMaterial, selectedQuality, uploadedFiles.length]);

    // Effect: Auto-select latest file
    useEffect(() => {
        if (uploadedFiles.length > 0 && !selectedFileId) {
            setSelectedFileId(uploadedFiles[uploadedFiles.length - 1].id);
        } else if (uploadedFiles.length === 0) {
            setSelectedFileId(null);
        }
    }, [uploadedFiles, selectedFileId]);

    // Discount Logic State
    const [volumeDiscounts, setVolumeDiscounts] = useState<any[]>([]);
    const [regularDiscount, setRegularDiscount] = useState<any>({ enabled: false, percentage: 0 });


    const [bankDetails, setBankDetails] = useState<any>({});

    useEffect(() => {
        const savedSlabs = localStorage.getItem("volumeDiscountSlabs");
        if (savedSlabs) {
            setVolumeDiscounts(JSON.parse(savedSlabs));
        } else {
            setVolumeDiscounts([
                { id: "1", minVolume: 2000, discount: 5, label: "Large Order" },
                { id: "2", minVolume: 4000, discount: 10, label: "Bulk Order" },
                { id: "3", minVolume: 8000, discount: 15, label: "Enterprise Order" },
            ]);
        }

        const savedRegular = localStorage.getItem("discountSettings");
        if (savedRegular) setRegularDiscount(JSON.parse(savedRegular));

        const savedBank = localStorage.getItem("bankDetails");
        if (savedBank) setBankDetails(JSON.parse(savedBank));
    }, []);

    // Total Cost Calculation with Discounts
    const { finalCost, totalVolume, discountApplied } = useMemo(() => {
        const subtotal = uploadedFiles.reduce((sum, file) => sum + file.estimatedCost, 0);
        const totalVol = uploadedFiles.reduce((sum, file) => sum + (file.volume * file.quantity), 0);

        // Find applicable volume discount
        // Sort slabs by minVolume descending to find the highest matching slab
        const sortedSlabs = [...volumeDiscounts].sort((a, b) => b.minVolume - a.minVolume);
        const applicableSlab = sortedSlabs.find(slab => totalVol >= slab.minVolume);

        let discountPercent = 0;
        let discountLabel = "";

        if (applicableSlab) {
            discountPercent = applicableSlab.discount;
            discountLabel = `${applicableSlab.label} (${applicableSlab.discount}%)`;
        } else if (regularDiscount.enabled) {
            discountPercent = regularDiscount.percentage;
            discountLabel = `Regular Discount (${regularDiscount.percentage}%)`;
        }

        const discountAmount = (subtotal * discountPercent) / 100;
        const discountedSubtotal = subtotal - discountAmount;

        const taxableValue = discountedSubtotal + quotationCharges.packagingCharges + quotationCharges.courierCharges;
        const taxAmount = (taxableValue * (quotationCharges.cgst + quotationCharges.sgst + quotationCharges.igst)) / 100;

        return {
            finalCost: Math.round(taxableValue + taxAmount),
            totalVolume: totalVol,
            discountApplied: { percent: discountPercent, label: discountLabel, amount: discountAmount }
        };
    }, [uploadedFiles, quotationCharges, volumeDiscounts, regularDiscount]);

    const totalCost = finalCost; // Keep variable name compatible for now

    const selectedFile = useMemo(() =>
        uploadedFiles.find(f => f.id === selectedFileId),
        [uploadedFiles, selectedFileId]);


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
            key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_missing",
            amount: order.amount,
            currency: order.currency,
            name: "ProtoFast",
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
                color: "#FF5722",
            },
        };

        const paymentObject = new (window as any).Razorpay(options);
        paymentObject.open();
    };

    const handleGenerateQuoteClick = () => {
        if (!isAuthenticated) {
            navigate('/signin', { state: { from: location } });
            return;
        }

        if (uploadedFiles.length === 0) {
            toast.error("Please upload at least one file.");
            return;
        }
        setQuoteStep('details');
        setShowDetailsDialog(true);
    }

    // --- New Features State ---
    const [showEmailPrompt, setShowEmailPrompt] = useState(false);
    const [emailForQuote, setEmailForQuote] = useState("");
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    const handleDownloadQuote = () => {
        if (uploadedFiles.length === 0) return;

        // Fetch bank details from local storage
        const savedBankDetails = localStorage.getItem("bankDetails");
        const bankDetails = savedBankDetails ? JSON.parse(savedBankDetails) : {};

        const doc = generateQuotePDF(uploadedFiles, quotationCharges, clientInfo, totalCost, bankDetails, discountApplied);
        doc.save(`ProtoFast_Quote_${Date.now()}.pdf`);
        toast.success("Quote PDF Downloaded!");
    };

    // ... (rest of handleEmailQuote and submitEmailQuote remain same)

    const handleEmailQuote = () => {
        if (uploadedFiles.length === 0) return;
        // Pre-fill email if user is logged in
        if (user?.email) setEmailForQuote(user.email);
        setShowEmailPrompt(true);
    };

    const submitEmailQuote = async () => {
        const targetEmail = emailForQuote || clientInfo.email;

        if (!targetEmail) {
            toast.error("Please provide an email address");
            setShowEmailPrompt(true);
            return;
        }

        setIsSendingEmail(true);
        try {
            const response = await fetch("/api/quote/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: targetEmail,
                    quoteDetails: {
                        files: uploadedFiles.map(f => ({
                            name: f.file.name,
                            material: f.material,
                            printType: f.printType,
                            quantity: f.quantity,
                            cost: f.estimatedCost
                        })),
                        totalCost: totalCost
                    }
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success(`Quote sent to ${targetEmail}!`);
                setShowEmailPrompt(false);
                setEmailForQuote("");
            } else {
                toast.error("Failed to send email");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error sending email");
        } finally {
            setIsSendingEmail(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-black font-sans">
            {/* ... Header and Main structure ... */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-bold font-mono uppercase tracking-widest rounded-none transition-all duration-300 px-6 py-2 flex items-center text-xs">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Link>
                    <h1 className="text-lg md:text-xl font-bold font-mono uppercase tracking-tighter text-center absolute left-1/2 transform -translate-x-1/2 w-full pointer-events-none">
                        <span className="pointer-events-auto">3D Printing Quote Generator</span>
                    </h1>
                    <div className="w-10"></div>
                </div>
            </header>

            <main className="lg:h-[calc(100vh-65px)] lg:overflow-hidden h-auto min-h-[calc(100vh-65px)] flex flex-col bg-gray-50 relative">
                {/* Background Grid */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                    <div className="absolute inset-0 bg-white/40 radial-gradient-center"></div>
                </div>
                <div className="container mx-auto px-4 py-6 grid lg:grid-cols-12 gap-6 lg:h-full h-auto relative z-10 pb-12 lg:pb-6">
                    {/* Left Column: Upload & Preview */}
                    <div className="lg:col-span-8 flex flex-col gap-6 lg:h-full h-auto min-h-0">
                        {/* Upload Card */}
                        <div className="bg-white p-6 border border-gray-200 shadow-sm flex-none h-48 flex flex-col">
                            <h2 className="text-xs font-bold font-mono uppercase tracking-widest mb-4 text-gray-900">Upload STL File</h2>
                            <div className="flex-1 border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center relative hover:border-[#FF5722] hover:bg-orange-50/10 transition-all cursor-pointer group"
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleFileUpload(e.dataTransfer.files);
                                }}
                                onClick={() => document.getElementById("hidden-file-input")?.click()}
                            >
                                <input id="hidden-file-input" type="file" multiple className="hidden" onChange={(e) => e.target.files && handleFileUpload(e.target.files)} />
                                <div className="flex flex-col items-center gap-2 transform group-hover:scale-105 transition-transform duration-200">
                                    <div className="p-2 bg-white rounded-full shadow-sm group-hover:shadow text-[#FF5722]">
                                        <UploadCloud className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-[#FF5722] uppercase tracking-widest transition-colors">Drag & Drop or Click to Select</span>
                                </div>
                            </div>
                        </div>

                        {/* Preview Card */}
                        <div className="bg-white p-1 border border-gray-200 shadow-sm flex-1 relative flex flex-col min-h-0">
                            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-1.5 border border-gray-200 shadow-sm">
                                <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-gray-900 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-gray-900"></span>
                                    {selectedFile ? selectedFile.file.name : "3D Preview"}
                                </h2>
                            </div>
                            <div className="absolute top-4 right-4 z-10">
                                <button onClick={() => setShowFullscreenViewer(true)} className="p-2 bg-white/90 backdrop-blur border border-gray-200 hover:bg-gray-100 transition-colors">
                                    <Eye className="w-4 h-4 text-gray-600" />
                                </button>
                            </div>

                            <div className="flex-1 bg-gray-50 relative overflow-hidden ring-1 ring-black/5">
                                {(selectedFile && (selectedFile.previewPath || selectedFile.fileType === "stl" || selectedFile.fileType === "gltf" || (selectedFile.fileType as string) === "glb")) ? (
                                    <>
                                        <div className="absolute inset-0">
                                            <ThreeDViewer
                                                fileUrl={selectedFile.previewPath || ""}
                                                fileName={selectedFile.file.name}
                                                className="w-full h-full"
                                                onExpand={() => setShowFullscreenViewer(true)}
                                            />
                                        </div>
                                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-6 pointer-events-none">
                                            <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm flex items-center gap-6 text-[10px] font-mono uppercase tracking-widest text-gray-600 border border-gray-200">
                                                <div className="flex items-center gap-2"><MousePointer2 className="w-3 h-3" /><span>Rotate (Left)</span></div>
                                                <div className="flex items-center gap-2"><Move className="w-3 h-3" /><span>Move (Right)</span></div>
                                                <div className="flex items-center gap-2"><Search className="w-3 h-3" /><span>Zoom (Scroll)</span></div>
                                            </div>
                                        </div>
                                    </>
                                ) : selectedFile ? (
                                    <img src={selectedFile.thumbnail} alt={selectedFile.file.name} className="w-full h-full object-contain p-8" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center w-full h-full text-gray-300">
                                        <div className="w-16 h-16 border-2 border-dashed border-gray-200 mb-4 bg-white flex items-center justify-center">
                                            <div className="w-8 h-8 bg-gray-100"></div>
                                        </div>
                                        <span className="text-xs font-mono uppercase tracking-widest text-gray-400">No File Selected</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Controls */}
                    <div className="lg:col-span-4 lg:h-full h-auto flex flex-col bg-gray-50 border border-gray-200 lg:border-l lg:border-t-0 lg:border-b-0 lg:border-r-0 shadow-xl lg:overflow-hidden overflow-visible z-20 rounded-lg lg:rounded-none">
                        <div className="flex-1 p-5 flex flex-col overflow-hidden">
                            {!selectedFileId ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <Settings className="w-12 h-12 text-gray-300 mb-4" />
                                    <p className="font-mono uppercase tracking-widest text-sm">Select a file to configure</p>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300" key={selectedFileId}>
                                    {/* Header for Selected File */}
                                    <div className="border-b border-gray-200 pb-4 mb-2 flex-none">
                                        {uploadedFiles.length > 1 ? (
                                            <div className="mb-4">
                                                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-bold">Files</p>
                                                <Select
                                                    value={selectedFileId}
                                                    onValueChange={(value) => setSelectedFileId(value)}
                                                >
                                                    <SelectTrigger className="w-full font-bold font-mono uppercase tracking-tighter text-xs h-10 rounded-none border-gray-200 bg-white focus:ring-0 focus:border-gray-900">
                                                        <SelectValue placeholder="Select File" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {uploadedFiles.map((file) => (
                                                            <SelectItem key={file.id} value={file.id} className="font-mono text-xs uppercase">
                                                                {file.file.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        ) : (
                                            <h3 className="font-bold font-mono uppercase tracking-tighter text-lg truncate mb-1 text-gray-900">
                                                {selectedFile?.file.name}
                                            </h3>
                                        )}
                                        <div className="flex justify-between items-center text-[10px] text-gray-400 uppercase tracking-widest font-medium">
                                            <span>{uploadedFiles.length} File{uploadedFiles.length !== 1 && 's'} Uploaded</span>
                                            {selectedFile?.volume && (
                                                <span className="text-gray-900 font-bold">
                                                    {selectedFile.volume.toFixed(2)} cm³
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Config Options Group */}
                                    <div className="space-y-5 flex-none mt-2">
                                        {/* Technology */}
                                        <div>
                                            <h2 className="text-xs font-bold font-mono uppercase tracking-widest mb-2 text-gray-400">Technology</h2>
                                            <div className="flex border border-gray-200 bg-white">
                                                {PRINT_TYPES.map((type) => (
                                                    <button
                                                        key={type.value}
                                                        onClick={() => updateFileProperty(selectedFileId, "printType", type.value)}
                                                        className={cn(
                                                            "flex-1 h-12 font-bold text-xs font-mono uppercase tracking-wider transition-all",
                                                            selectedFile?.printType === type.value
                                                                ? "bg-black text-white"
                                                                : "bg-white text-gray-400 hover:text-gray-900 hover:bg-gray-50 border-r border-gray-200 last:border-r-0"
                                                        )}
                                                    >
                                                        {type.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Material */}
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-gray-400">Material</h2>
                                                <span className="text-[9px] bg-gray-200 text-gray-600 px-2 py-0.5 font-bold font-mono uppercase tracking-wider">Required</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-px bg-gray-200 border border-gray-200">
                                                {(MATERIALS[selectedFile?.printType as keyof typeof MATERIALS] || []).map((mat) => (
                                                    <button
                                                        key={mat.value}
                                                        onClick={() => updateFileProperty(selectedFileId, "material", mat.value)}
                                                        className={cn(
                                                            "h-14 flex flex-col items-center justify-center font-bold font-mono text-xs uppercase tracking-wider transition-all",
                                                            selectedFile?.material === mat.value
                                                                ? "bg-[#1a202c] text-white"
                                                                : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                                                        )}
                                                    >
                                                        {mat.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Finish */}
                                        <div>
                                            <h2 className="text-xs font-bold font-mono uppercase tracking-widest mb-2 text-gray-400">Finish</h2>
                                            <div className="flex border border-gray-200 bg-white">
                                                {FINISHES.map((finish) => (
                                                    <button
                                                        key={finish.value}
                                                        onClick={() => updateFileProperty(selectedFileId, "finish", finish.value)}
                                                        className={cn(
                                                            "flex-1 h-12 font-bold text-xs font-mono uppercase tracking-wider transition-all",
                                                            selectedFile?.finish === finish.value
                                                                ? "bg-black text-white"
                                                                : "bg-white text-gray-400 hover:text-gray-900 hover:bg-gray-50 border-r border-gray-200 last:border-r-0"
                                                        )}
                                                    >
                                                        {finish.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quantity & Footer */}
                        <div className="bg-gray-50 border-t border-gray-200 flex-none z-10">
                            {selectedFileId && (
                                <div className="px-6 pt-4 pb-2">
                                    <div className="flex justify-between items-end mb-2">
                                        <h2 className="text-xs font-bold font-mono uppercase tracking-widest text-gray-400">Quantity</h2>
                                        {discountApplied.amount > 0 && (
                                            <span className="text-[10px] font-bold font-mono text-green-600 uppercase tracking-wider">
                                                {discountApplied.label} Applied
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between p-0">
                                        <div className="flex items-center border border-gray-200 rounded-none bg-white">
                                            <button
                                                onClick={() => updateFileProperty(selectedFileId, "quantity", Math.max(1, (selectedFile?.quantity || 1) - 1))}
                                                className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors border-r border-gray-100"
                                            >
                                                -
                                            </button>
                                            <div className="w-20 text-center font-mono font-bold text-lg text-gray-900">
                                                {selectedFile?.quantity || 1}
                                            </div>
                                            <button
                                                onClick={() => updateFileProperty(selectedFileId, "quantity", (selectedFile?.quantity || 1) + 1)}
                                                className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors border-l border-gray-100"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs text-gray-400 uppercase tracking-widest block mb-1">Item Cost</span>
                                            {discountApplied.percent > 0 ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm text-gray-400 line-through font-mono">
                                                        ₹{selectedFile?.estimatedCost}
                                                    </span>
                                                    <span className="font-bold text-2xl text-[#FF5722] font-mono">
                                                        ₹{Math.round((selectedFile?.estimatedCost || 0) * (1 - discountApplied.percent / 100))}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="font-bold text-2xl text-gray-900 font-mono">
                                                    ₹{selectedFile?.estimatedCost}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Total Volume Info */}
                                    <div className="mt-2 text-right">
                                        <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                                            Total Volume: {totalVolume.toFixed(2)} cm³
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Footer Buttons */}
                            <div className="px-6 pb-6 space-y-3">
                                {/* Bank Details Card on Quote Page */}
                                {(bankDetails.accountName || bankDetails.accountNumber) && (
                                    <div className="bg-white border border-gray-200 p-4 mb-4 shadow-sm">
                                        <h3 className="text-[10px] font-bold font-mono uppercase tracking-widest text-[#FF5722] mb-3 border-b border-gray-100 pb-2">
                                            Bank Transfer Details
                                        </h3>
                                        <div className="space-y-1 text-[10px] font-mono text-gray-600 uppercase">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Account:</span>
                                                <span className="font-bold text-gray-900">{bankDetails.accountNumber || "-"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">IFSC:</span>
                                                <span className="font-bold text-gray-900">{bankDetails.ifscCode || "-"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Bank:</span>
                                                <span className="font-bold text-gray-900 truncate ml-2">{bankDetails.bankName || "Bank"}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={handleGenerateQuoteClick}
                                    className="w-full h-14 bg-[#FF5722] hover:bg-[#F4511E] text-white font-bold font-mono text-xl uppercase tracking-widest shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all rounded-none"
                                >
                                    GENERATE QUOTE
                                </Button>

                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (uploadedFiles.length === 0) return;
                                            setQuoteStep('preview');
                                            setShowDetailsDialog(true);
                                        }}
                                        disabled={uploadedFiles.length === 0}
                                        className="h-12 border border-gray-200 hover:bg-gray-900 hover:text-white hover:border-gray-900 text-gray-900 font-bold font-mono text-[10px] uppercase tracking-wider rounded-none transition-all shadow-sm"
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Preview Quote
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleDownloadQuote}
                                        disabled={uploadedFiles.length === 0}
                                        className="h-12 border border-gray-200 hover:bg-gray-900 hover:text-white hover:border-gray-900 text-gray-900 font-bold font-mono text-[10px] uppercase tracking-wider rounded-none transition-all shadow-sm"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download PDF
                                    </Button>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={handleEmailQuote}
                                    disabled={uploadedFiles.length === 0}
                                    className="w-full h-12 border border-black text-black hover:bg-black hover:text-white font-bold font-mono text-[10px] uppercase tracking-wider rounded-none transition-all"
                                >
                                    <Mail className="w-4 h-4 mr-2" />
                                    Email Quote to Me
                                </Button>
                                <p className="text-center text-[10px] text-gray-300 font-mono pt-2">
                                    *Instant quote estimation. Final price may vary slightly.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main >

            {/* Email Prompt Dialog */}
            < Dialog open={showEmailPrompt} onOpenChange={setShowEmailPrompt} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-mono uppercase">Email Quote</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div>
                            <label className="block text-xs font-bold font-mono uppercase tracking-widest text-gray-500 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={emailForQuote}
                                onChange={(e) => setEmailForQuote(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-[#FF5722] font-mono text-sm transition-colors"
                            />
                        </div>
                        <Button
                            onClick={submitEmailQuote}
                            disabled={isSendingEmail}
                            className="w-full h-12 bg-[#FF5722] hover:bg-[#F4511E] text-white font-bold font-mono uppercase tracking-widest"
                        >
                            {isSendingEmail ? "Sending..." : "Send Quote"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog >

            {/* Details & Preview Dialog */}
            < Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog} >
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-mono uppercase">
                            {quoteStep === 'details' ? 'Confirm Details' : 'Quote Preview'}
                        </DialogTitle>
                        <DialogDescription>
                            {quoteStep === 'details' ? 'Please review your details before generating the quote.' : 'Review your quote before proceeding to payment.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-1">
                        {quoteStep === 'details' ? (
                            <>
                                <ClientInfoForm
                                    clientInfo={clientInfo}
                                    quotationCharges={quotationCharges}
                                    onClientInfoChange={(k, v) => setClientInfo(prev => ({ ...prev, [k]: v }))}
                                    onChargesChange={(k, v) => setQuotationCharges(prev => ({ ...prev, [k]: v }))}
                                />
                                <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
                                    <Button
                                        onClick={() => setQuoteStep('preview')}
                                        className="w-full md:w-auto h-12 text-lg font-bold bg-gray-900 hover:bg-black text-white rounded-md uppercase"
                                    >
                                        Proceed to Preview
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <QuotePreview
                                files={uploadedFiles}
                                charges={quotationCharges}
                                clientInfo={clientInfo}
                                totalCost={totalCost}
                                bankDetails={bankDetails}
                                discountApplied={discountApplied}
                                onBack={() => setQuoteStep('details')}
                                onPayment={handlePayment}
                                onEmail={submitEmailQuote}
                                isSendingEmail={isSendingEmail}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog >
            {/* Fullscreen Viewer Dialog */}
            <Dialog open={showFullscreenViewer} onOpenChange={setShowFullscreenViewer}>
                <DialogContent className="max-w-[95vw] h-[90vh] p-0 border-none bg-black/95">
                    <div className="relative w-full h-full">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full"
                            onClick={() => setShowFullscreenViewer(false)}
                        >
                            <X className="w-6 h-6" />
                        </Button>
                        {selectedFile && (
                            <ThreeDViewer
                                fileUrl={selectedFile.previewPath || ""}
                                fileName={selectedFile.file.name}
                                className="w-full h-full"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}
