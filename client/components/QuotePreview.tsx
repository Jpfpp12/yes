import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Mail, CreditCard, X } from "lucide-react";
import { generateQuotePDF } from "@/utils/pdfGenerator";
import { toast } from "sonner";

interface QuotePreviewProps {
    files: any[];
    charges: any;
    clientInfo: any;
    totalCost: number;
    bankDetails?: any;
    discountApplied?: any;
    onBack: () => void;
    onPayment: () => void;
    onEmail: () => void;
    isSendingEmail: boolean;
}

export default function QuotePreview({
    files,
    charges,
    clientInfo,
    totalCost,
    bankDetails = {},
    discountApplied = { amount: 0, label: "", percent: 0 },
    onBack,
    onPayment,
    onEmail,
    isSendingEmail
}: QuotePreviewProps) {
    const [pdfUrl, setPdfUrl] = useState<string>("");

    useEffect(() => {
        // Generate PDF on mount
        const doc = generateQuotePDF(files, charges, clientInfo, totalCost, bankDetails, discountApplied);
        const pdfDataUri = doc.output("datauristring");
        setPdfUrl(pdfDataUri);
    }, [files, charges, clientInfo, totalCost, bankDetails, discountApplied]);

    const handleDownload = () => {
        const doc = generateQuotePDF(files, charges, clientInfo, totalCost, bankDetails, discountApplied);
        doc.save(`ProtoFast_Quote_${Date.now()}.pdf`);
        toast.success("Quote PDF Downloaded");
    };

    return (
        <div className="flex flex-col h-[80vh]">
            <div className="flex-1 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden relative">
                {pdfUrl ? (
                    <iframe src={pdfUrl} className="w-full h-full" title="Quote Preview" />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="font-mono animate-pulse">Generating Preview...</p>
                    </div>
                )}
            </div>

            <div className="mt-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                <Button variant="outline" onClick={onBack} className="w-full md:w-auto">
                    Back to Edit
                </Button>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <Button variant="secondary" onClick={handleDownload} className="flex-1 md:flex-none">
                        <Download className="w-4 h-4 mr-2" /> Download PDF
                    </Button>
                    <Button variant="secondary" onClick={onEmail} disabled={isSendingEmail} className="flex-1 md:flex-none">
                        <Mail className="w-4 h-4 mr-2" /> {isSendingEmail ? "Sending..." : "Email Quote"}
                    </Button>
                    <Button onClick={onPayment} className="bg-[#FF5722] hover:bg-[#F4511E] text-white font-bold flex-1 md:flex-none">
                        <CreditCard className="w-4 h-4 mr-2" /> Pay ₹{totalCost}
                    </Button>
                </div>
            </div>
        </div>
    );
}
