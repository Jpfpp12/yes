import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Mail, FileText } from "lucide-react";
import { quotationNumberService } from "@/services/quotationNumberService";
import { generateQuotationPDF } from "@/components/PDFGenerator";

interface UploadedFile {
  id: string;
  file: File;
  printType: string;
  material: string;
  finish: string;
  quantity: number;
  volume: number;
  weight: number;
  estimatedCost: number;
}

interface ClientInfo {
  name: string;
  gstNumber: string;
  billingAddress: string;
  shippingAddress: string;
}

interface QuotationCharges {
  cgst: number;
  sgst: number;
  igst: number;
  packagingCharges: number;
  courierCharges: number;
}

interface QuotationData {
  files: UploadedFile[];
  clientInfo: ClientInfo;
  charges: QuotationCharges;
  totalCost: number;
  taxDetails: {
    subtotal: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalTax: number;
    grandTotal: number;
  };
}

interface QuotationGeneratorProps {
  quotationData: QuotationData;
}

const QuotationGenerator: React.FC<QuotationGeneratorProps> = ({
  quotationData,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [quotationNumber, setQuotationNumber] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    setQuotationNumber(quotationNumberService.peekNextQuotationNumber());
  }, []);

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}${month}${year}`;
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const manufacturingAccuracy = {
    fdm: "FDM: 300-400 microns or ±0.3 mm/100mm",
    sla: "SLA: 100-200 microns or ±0.2 mm/100mm",
    "sla-clear-raw": "SLA Clear (Raw): 100-200 microns or ±0.2 mm/100mm",
    "sla-clear-lacquer":
      "SLA Clear (Lacquer): 150-350 microns or ±0.35 mm/100mm",
    sls: "SLS: 150-250 microns or ±0.2 mm / 100mm",
    metal: "Metal: ±0.1 mm",
  };

  const bankDetails = {
    accountName: "Protoforgelabs Private Limited",
    accountNumber: "12345678910",
    ifscCode: "HDFC0000123",
    swiftCode: "HDFCIXXX",
    bankName: "HDFC BANK LTD",
    branchName: "BANGALORE - MAHADEVAPURA",
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const now = new Date();
      setCurrentDate(now);
      const actualQuotationNumber =
        quotationNumberService.getNextQuotationNumber();
      setQuotationNumber(actualQuotationNumber);
      quotationNumberService.generateQuotation(
        quotationData.clientInfo,
        quotationData.files,
        quotationData.charges,
      );
      await generateQuotationPDF(quotationData, actualQuotationNumber);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const sendEmail = async () => {
    try {
      const now = new Date();
      setCurrentDate(now);
      const actualQuotationNumber =
        quotationNumberService.getNextQuotationNumber();
      setQuotationNumber(actualQuotationNumber);
      quotationNumberService.generateQuotation(
        quotationData.clientInfo,
        quotationData.files,
        quotationData.charges,
      );

      const subject = `Quotation ${actualQuotationNumber} - 3D Printing Services`;
      const body = `Dear ${quotationData.clientInfo.name},\n\nThank you for your interest in our 3D printing services. Please find your quotation details below:\n\nQuotation Number: ${actualQuotationNumber}\nDate: ${formatDate(now)}\nTime: ${formatTime(now)}\n\nItems Summary:\n${quotationData.files.map((file) => `- ${file.file.name} (Qty: ${file.quantity}) - ₹${file.estimatedCost.toLocaleString("en-IN")}`).join("\n")}\n\nGrand Total: ₹${quotationData.taxDetails.grandTotal.toLocaleString("en-IN")}\n\nPlease contact us if you have any questions.\n\nBest regards,\nProtoforgelabs Private Limited`;

      const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
    } catch (error) {
      try {
        const emailContentFallback =
          `Subject: Quotation - 3D Printing Services\n\n` + `Body:\n`;
        const blob = new Blob([emailContentFallback], {
          type: "text/plain;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "quotation-email.txt";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (_) {}
      console.error("Error sending email:", error);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <FileText className="mr-2 h-4 w-4" />
          Preview Quotation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quotation Preview - {quotationNumber}</DialogTitle>
        </DialogHeader>
        <div
          className="border rounded-lg bg-white"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "20mm 18mm",
            margin: "0 auto",
          }}
        >
          <div
            className="border-b-2 border-blue-600"
            style={{
              paddingBottom: 12,
              marginBottom: 16,
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={{ textAlign: "left" }}>
              {(() => {
                const logo = localStorage.getItem("company.logo");
                return logo ? (
                  <img
                    src={logo}
                    alt="Logo"
                    style={{
                      maxWidth: 120,
                      maxHeight: 60,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <div className="text-gray-400 font-semibold">
                    Company Logo
                  </div>
                );
              })()}
            </div>
            <div className="text-center">
              <h1
                className="font-bold text-blue-600 mb-2"
                style={{ fontSize: "20pt" }}
              >
                PROTOFORGELABS PRIVATE LIMITED
              </h1>
              <h2 className="mb-1 font-semibold" style={{ fontSize: "18pt" }}>
                QUOTATION
              </h2>
            </div>
            <div
              className="text-gray-700"
              style={{ fontSize: "10pt", textAlign: "right" }}
            >
              <div>
                <strong>Quotation No:</strong> {quotationNumber}
              </div>
              <div>
                <strong>Date:</strong> {formatDate(currentDate)}
              </div>
              <div>
                <strong>Time:</strong> {formatTime(currentDate)}
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="border rounded" style={{ padding: 12 }}>
              <h3
                className="font-semibold text-blue-600 border-b"
                style={{ paddingBottom: 8, marginBottom: 8, fontSize: "12pt" }}
              >
                Bill To:
              </h3>
              <div className="space-y-1" style={{ fontSize: "10pt" }}>
                <div className="font-semibold">
                  {quotationData.clientInfo.name}
                </div>
                <div className="whitespace-pre-line">
                  {quotationData.clientInfo.billingAddress}
                </div>
              </div>
            </div>
            <div className="border rounded" style={{ padding: 12 }}>
              <h3
                className="font-semibold text-blue-600 border-b"
                style={{ paddingBottom: 8, marginBottom: 8, fontSize: "12pt" }}
              >
                Ship To:
              </h3>
              <div className="whitespace-pre-line" style={{ fontSize: "10pt" }}>
                {quotationData.clientInfo.shippingAddress ||
                  quotationData.clientInfo.billingAddress}
              </div>
            </div>
          </div>
          <div className="mb-4">
            <table
              className="w-full border-collapse border border-gray-300"
              style={{ fontSize: "10pt" }}
            >
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">S.No</th>
                  <th
                    className="border border-gray-300 p-2"
                    style={{ width: 52 }}
                  >
                    Preview
                  </th>
                  <th className="border border-gray-300 p-2">Item</th>
                  <th className="border border-gray-300 p-2">Type</th>
                  <th className="border border-gray-300 p-2">Material</th>
                  <th className="border border-gray-300 p-2">Qty</th>
                  <th className="border border-gray-300 p-2">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {quotationData.files.map((file, index) => {
                  const name = file.file.name as string;
                  const display =
                    name.length > 40 ? name.slice(0, 37) + "…" : name;
                  return (
                    <tr key={file.id}>
                      <td className="border border-gray-300 p-2 text-center">
                        {index + 1}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        <img
                          src={file.thumbnail}
                          alt="thumb"
                          className="inline-block"
                          style={{
                            width: 46,
                            height: 46,
                            objectFit: "contain",
                            background: "#f5f5f5",
                            borderRadius: 2,
                          }}
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <div className="truncate" title={name}>
                          {display}
                        </div>
                      </td>
                      <td className="border border-gray-300 p-2">
                        {String(file.printType).toUpperCase()}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {file.material}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        {file.quantity}
                      </td>
                      <td className="border border-gray-300 p-2 text-right">
                        ₹{file.estimatedCost.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-100 font-semibold">
                  <td
                    colSpan={6}
                    className="border border-gray-300 p-2 text-right"
                  >
                    Grand Total:
                  </td>
                  <td className="border border-gray-300 p-2 text-right">
                    ₹
                    {quotationData.taxDetails.grandTotal.toLocaleString(
                      "en-IN",
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 border rounded" style={{ padding: 12 }}>
            <h3
              className="font-semibold text-blue-600 mb-2"
              style={{ fontSize: "11pt" }}
            >
              Quotation Summary
            </h3>
            <ul className="list-disc pl-6" style={{ fontSize: "9pt" }}>
              <li>
                Subtotal: ₹
                {quotationData.taxDetails.subtotal.toLocaleString("en-IN")}
              </li>
              {quotationData.taxDetails?.regularDiscountAmount ? (
                <li>
                  Regular Discount: -₹
                  {quotationData.taxDetails.regularDiscountAmount.toLocaleString(
                    "en-IN",
                  )}
                </li>
              ) : null}
              {quotationData.taxDetails?.volumeDiscountAmount ? (
                <li>
                  Volume Discount: -₹
                  {quotationData.taxDetails.volumeDiscountAmount.toLocaleString(
                    "en-IN",
                  )}
                </li>
              ) : null}
              <li>
                Tax: ₹
                {quotationData.taxDetails.totalTax.toLocaleString("en-IN")}
              </li>
              {JSON.parse(
                localStorage.getItem("additionalChargesEnabled") || "true",
              ) ? (
                <>
                  <li>
                    Packaging: ₹
                    {quotationData.charges.packagingCharges.toLocaleString(
                      "en-IN",
                    )}
                  </li>
                  <li>
                    Courier: ₹
                    {quotationData.charges.courierCharges.toLocaleString(
                      "en-IN",
                    )}
                  </li>
                </>
              ) : (
                <li>Shipping charges at actual</li>
              )}
              <li>
                <strong>
                  Grand Total: ₹
                  {quotationData.taxDetails.grandTotal.toLocaleString("en-IN")}
                </strong>
              </li>
            </ul>
            <div className="mt-4">
              <h3
                className="font-semibold text-blue-600 mb-2"
                style={{ fontSize: "11pt" }}
              >
                Manufacturing Accuracy (Default until stated otherwise):
              </h3>
              <div className="pl-6" style={{ fontSize: "9pt" }}>
                {Object.values(manufacturingAccuracy).map((a) => (
                  <div key={a as string}>• {a}</div>
                ))}
              </div>
              <div className="mt-4">
                <h3
                  className="font-semibold text-blue-600 mb-2"
                  style={{ fontSize: "11pt" }}
                >
                  Bank Transfer Details:
                </h3>
                <div style={{ fontSize: "9pt" }}>
                  <div>
                    <strong>Account Name:</strong> {bankDetails.accountName}
                  </div>
                  <div>
                    <strong>A/c No:</strong> {bankDetails.accountNumber}
                  </div>
                  <div>
                    <strong>IFSC Code:</strong> {bankDetails.ifscCode}
                  </div>
                  <div>
                    <strong>Swift Code:</strong> {bankDetails.swiftCode}
                  </div>
                  <div>
                    <strong>Bank Name:</strong> {bankDetails.bankName}
                  </div>
                  <div>
                    <strong>Branch Name:</strong> {bankDetails.branchName}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 z-10 bg-white border-t pt-3 pb-3 flex justify-center space-x-4 mt-4">
          <Button
            onClick={generatePDF}
            disabled={isGenerating}
            className="bg-green-600 hover:bg-green-700"
          >
            <Download className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
          <Button onClick={sendEmail} variant="outline">
            <Mail className="mr-2 h-4 w-4" />
            Email Quotation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuotationGenerator;
