import { useMemo } from "react";
import type { UploadedFile } from "@/hooks/useFileUpload";

export interface QuotationCharges {
  cgst: number;
  sgst: number;
  igst: number;
  packagingCharges: number;
  courierCharges: number;
}

export function useCostCalculation(
  uploadedFiles: UploadedFile[],
  quotationCharges: QuotationCharges,
) {
  const totalCost = useMemo(
    () => uploadedFiles.reduce((sum, file) => sum + file.estimatedCost, 0),
    [uploadedFiles],
  );

  const taxDetails = useMemo(() => {
    const subtotal = totalCost;
    const discountSettings = JSON.parse(
      localStorage.getItem("discountSettings") ||
        '{"enabled": false, "percentage": 0}',
    );
    const volumeDiscountSlabs = JSON.parse(
      localStorage.getItem("volumeDiscountSlabs") || "[]",
    );
    const totalVolume = uploadedFiles.reduce(
      (sum, file) => sum + file.volume * file.quantity,
      0,
    );
    let volumeDiscount = 0;
    let appliedVolumeDiscount = "";
    for (const slab of volumeDiscountSlabs.sort(
      (a: any, b: any) => b.minVolume - a.minVolume,
    )) {
      if (totalVolume >= slab.minVolume) {
        volumeDiscount = slab.discount;
        appliedVolumeDiscount = `${slab.discount}% (${slab.label})`;
        break;
      }
    }
    let nearSlabMessage = "";
    const sortedSlabs = volumeDiscountSlabs.sort(
      (a: any, b: any) => a.minVolume - b.minVolume,
    );
    for (const slab of sortedSlabs) {
      if (totalVolume < slab.minVolume) {
        const threshold = slab.minVolume * 0.7;
        if (totalVolume >= threshold) {
          const remaining = slab.minVolume - totalVolume;
          nearSlabMessage = `To get ${slab.discount}% extra discount (${slab.label}), add ${remaining.toFixed(0)} cm³ more volume.`;
        }
        break;
      }
    }
    const regularDiscountAmount = discountSettings.enabled
      ? (subtotal * discountSettings.percentage) / 100
      : 0;
    const volumeDiscountAmount = (subtotal * volumeDiscount) / 100;
    const totalDiscountAmount = regularDiscountAmount + volumeDiscountAmount;
    const afterDiscount = subtotal - totalDiscountAmount;
    const cgstAmount =
      quotationCharges.igst > 0
        ? 0
        : (afterDiscount * quotationCharges.cgst) / 100;
    const sgstAmount =
      quotationCharges.igst > 0
        ? 0
        : (afterDiscount * quotationCharges.sgst) / 100;
    const igstAmount =
      quotationCharges.igst > 0
        ? (afterDiscount * quotationCharges.igst) / 100
        : 0;
    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const totalAfterTax = afterDiscount + totalTax;
    const grandTotal =
      totalAfterTax +
      quotationCharges.packagingCharges +
      quotationCharges.courierCharges;
    return {
      subtotal,
      regularDiscountAmount,
      volumeDiscountAmount,
      appliedVolumeDiscount,
      totalDiscountAmount,
      afterDiscount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTax,
      totalAfterTax,
      grandTotal,
      totalVolume,
      nearSlabMessage,
      discountSettings,
      volumeDiscount,
    };
  }, [totalCost, uploadedFiles, quotationCharges]);

  return { totalCost, taxDetails };
}
