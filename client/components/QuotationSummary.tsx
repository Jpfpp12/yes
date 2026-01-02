import React from "react";
import { Badge } from "@/components/ui/badge";

interface UploadedFile {
  volume: number;
  quantity: number;
  weight: number;
}

interface TaxDetails {
  subtotal: number;
  regularDiscountAmount: number;
  volumeDiscountAmount: number;
  appliedVolumeDiscount: string;
  totalDiscountAmount: number;
  afterDiscount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAfterTax: number;
  grandTotal: number;
  totalVolume: number;
  nearSlabMessage: string;
  discountSettings: any;
  volumeDiscount: number;
}

interface QuotationCharges {
  cgst: number;
  sgst: number;
  igst: number;
  packagingCharges: number;
  courierCharges: number;
}

interface QuotationSummaryProps {
  uploadedFiles: UploadedFile[];
  taxDetails: TaxDetails;
  quotationCharges: QuotationCharges;
}

export default function QuotationSummary({
  uploadedFiles,
  taxDetails,
  quotationCharges,
}: QuotationSummaryProps) {
  return (
    <div className="border border-gray-200 bg-white p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold font-mono uppercase">Quotation Summary</h3>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* File Summary */}
        <div className="space-y-4">
          <h4 className="font-bold font-mono uppercase text-sm border-b border-gray-100 pb-2">File Statistics</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-mono">FILES:</span>
              <span className="font-bold">{uploadedFiles.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-mono">TOTAL ITEMS:</span>
              <span className="font-bold">
                {uploadedFiles.reduce((sum, file) => sum + file.quantity, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-mono">TOTAL VOLUME:</span>
              <span className="font-bold">
                {uploadedFiles
                  .reduce((sum, file) => sum + file.volume * file.quantity, 0)
                  .toFixed(2)}{" "}
                cm³
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-mono">TOTAL WEIGHT:</span>
              <span className="font-bold">
                {uploadedFiles
                  .reduce((sum, file) => sum + file.weight * file.quantity, 0)
                  .toFixed(2)}{" "}
                g
              </span>
            </div>
          </div>

          {/* Near-slab Discount Notification */}
          {taxDetails.nearSlabMessage && (
            <div className="p-3 bg-primary/5 border border-primary/20 text-xs">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-4 w-4 text-primary"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="font-bold text-primary font-mono uppercase">
                    Volume Discount Opportunity!
                  </h4>
                  <p className="text-primary/80 mt-1">
                    {taxDetails.nearSlabMessage}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-4">
          <h4 className="font-bold font-mono uppercase text-sm border-b border-gray-100 pb-2">Financials</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-mono">SUBTOTAL:</span>
              <span className="font-bold">
                ₹{taxDetails.subtotal.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Discount Section */}
            {(taxDetails.regularDiscountAmount > 0 ||
              taxDetails.volumeDiscountAmount > 0) && (
                <>
                  {taxDetails.regularDiscountAmount > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                      <span className="font-mono">
                        DISCOUNT ({taxDetails.discountSettings.percentage}%):
                      </span>
                      <span>
                        - ₹
                        {taxDetails.regularDiscountAmount.toLocaleString(
                          "en-IN",
                        )}
                      </span>
                    </div>
                  )}
                  {taxDetails.volumeDiscountAmount > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                      <span className="font-mono">
                        VOL. DISCOUNT {taxDetails.appliedVolumeDiscount}:
                      </span>
                      <span>
                        - ₹
                        {taxDetails.volumeDiscountAmount.toLocaleString(
                          "en-IN",
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center font-bold border-b border-dashed border-gray-200 pb-2 pt-2">
                    <span className="font-mono">AFTER DISCOUNT:</span>
                    <span>
                      ₹{taxDetails.afterDiscount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </>
              )}

            {quotationCharges.igst > 0 ? (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-mono">
                  IGST ({quotationCharges.igst}%):
                </span>
                <span className="font-bold">
                  ₹{Math.round(taxDetails.igstAmount).toLocaleString("en-IN")}
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-mono">
                    CGST ({quotationCharges.cgst}%):
                  </span>
                  <span className="font-bold">
                    ₹
                    {Math.round(taxDetails.cgstAmount).toLocaleString(
                      "en-IN",
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-mono">
                    SGST ({quotationCharges.sgst}%):
                  </span>
                  <span className="font-bold">
                    ₹
                    {Math.round(taxDetails.sgstAmount).toLocaleString(
                      "en-IN",
                    )}
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-mono">PACKAGING:</span>
              <span className="font-bold">
                ₹{quotationCharges.packagingCharges.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-mono">COURIER:</span>
              <span className="font-bold">
                ₹{quotationCharges.courierCharges.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="border-t border-black pt-4 mt-4">
              <div className="flex justify-between items-center text-lg font-black">
                <span className="uppercase tracking-tight">Grand Total</span>
                <span className="text-primary">
                  ₹{Math.round(taxDetails.grandTotal).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions & Tax Settings */}
        <div className="space-y-4">
          <h4 className="font-bold font-mono uppercase text-sm border-b border-gray-100 pb-2">Configuration</h4>

          <div className="space-y-3 text-xs bg-gray-50 p-4 border border-gray-100">
            <h5 className="font-bold uppercase mb-2 text-gray-400">Tax Rates</h5>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-mono">CGST:</span>
              <span className="font-bold">{quotationCharges.cgst}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-mono">SGST:</span>
              <span className="font-bold">{quotationCharges.sgst}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-mono">IGST:</span>
              <span className="font-bold">{quotationCharges.igst}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
