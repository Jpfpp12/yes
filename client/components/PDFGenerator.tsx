import React from "react";

interface PDFGeneratorProps {
  quotationData: any;
  quotationNumber: string;
  onGenerate?: () => void;
}

export const generateQuotationPDF = (
  quotationData: any,
  quotationNumber: string,
): Promise<void> => {
  return new Promise((resolve) => {
    // Create a new window for printing
    const printWindow = window.open("", "_blank", "width=800,height=600");

    if (!printWindow) {
      alert("Please allow popups to generate PDF");
      resolve();
      return;
    }

    const currentDate = new Date();
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

    const bankDetails = JSON.parse(localStorage.getItem("bankDetails") || "{}");
    const defaultBankDetails = {
      accountName: "Protoforgelabs Private Limited",
      accountNumber: "12345678910",
      ifscCode: "HDFC0000123",
      swiftCode: "HDFCIXXX",
      bankName: "HDFC BANK LTD",
      branchName: "BANGALORE - MAHADEVAPURA",
    };

    const finalBankDetails = { ...defaultBankDetails, ...bankDetails };

    // Check if discount is enabled
    const discountSettings = JSON.parse(
      localStorage.getItem("discountSettings") ||
        '{"enabled": false, "percentage": 0}',
    );
    const volumeDiscountSlabs = JSON.parse(
      localStorage.getItem("volumeDiscountSlabs") || "[]",
    );

    // Calculate total volume
    const totalVolume = quotationData.files.reduce(
      (sum: number, file: any) => sum + file.volume * file.quantity,
      0,
    );

    // Calculate volume-based discount
    let volumeDiscount = 0;
    let appliedVolumeDiscount = "";
    for (const slab of volumeDiscountSlabs.sort(
      (a: any, b: any) => b.minVolume - a.minVolume,
    )) {
      if (totalVolume >= slab.minVolume) {
        volumeDiscount = slab.discount;
        appliedVolumeDiscount = `${slab.discount}% (Volume: ${totalVolume.toFixed(2)} cm³ ≥ ${slab.minVolume} cm³)`;
        break;
      }
    }

    // Calculate discounts
    const subtotal = quotationData.totalCost;
    const regularDiscountAmount = discountSettings.enabled
      ? (subtotal * discountSettings.percentage) / 100
      : 0;
    const volumeDiscountAmount = (subtotal * volumeDiscount) / 100;
    const totalDiscountAmount = regularDiscountAmount + volumeDiscountAmount;
    const afterDiscount = subtotal - totalDiscountAmount;

    // Calculate taxes on discounted amount
    const cgstAmount =
      quotationData.charges.igst > 0
        ? 0
        : (afterDiscount * quotationData.charges.cgst) / 100;
    const sgstAmount =
      quotationData.charges.igst > 0
        ? 0
        : (afterDiscount * quotationData.charges.sgst) / 100;
    const igstAmount =
      quotationData.charges.igst > 0
        ? (afterDiscount * quotationData.charges.igst) / 100
        : 0;
    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const totalAfterTax = afterDiscount + totalTax;
    const grandTotal =
      totalAfterTax +
      quotationData.charges.packagingCharges +
      quotationData.charges.courierCharges;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Quotation ${quotationNumber}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm 10mm; /* Top/Bottom 20mm, Left/Right 10mm */
            @top-center { content: element(doc-header); }
            @bottom-right {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 9pt;
                color: #666;
            }
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
            font-size: 10pt; /* print body size */
            line-height: 1.4;
        }

        .page-break {
            page-break-before: always;
        }

        .header {
            text-align: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 16px;
        }
        .print-header { position: running(doc-header); }

        .company-name {
            font-size: 20pt;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 6px;
        }

        .quotation-title {
            font-size: 18pt;
            margin-bottom: 12px;
            font-weight: bold;
        }

        .quotation-info {
            font-size: 10pt;
            color: #666;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 16px;
        }

        .info-section {
            border: 1px solid #ddd;
            padding: 12px;
            border-radius: 4px;
            background-color: #fafafa;
        }

        .info-section h3 {
            margin: 0 0 8px 0;
            color: #2563eb;
            border-bottom: 1px solid #eee;
            padding-bottom: 4px;
            font-size: 12pt;
        }

        .info-content {
            font-size: 10pt;
            line-height: 1.5;
            word-break: break-word;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 10pt; /* table text size */
        }

        th, td {
            border: 1px solid #ddd;
            padding: 8px 6px;
            text-align: left;
            vertical-align: top;
            word-break: break-word;
        }

        th {
            background-color: #f8f9fa;
            font-weight: bold;
            font-size: 10pt;
            text-align: center;
        }

        .thumbnail-cell {
            width: 52px;
            text-align: center;
        }

        .thumbnail-img {
            width: 46px;
            height: 46px;
            object-fit: contain;
            border-radius: 2px;
            background: #f5f5f5;
        }

        .filename-full {
            font-size: 8.5pt; /* footnote size */
            color: #666;
            margin-top: 2px;
        }

        .total-row {
            background-color: #f8f9fa;
            font-weight: bold;
        }

        .discount-row {
            background-color: #e8f5e8;
            color: #2d5a2d;
        }

        .grand-total {
            background-color: #2563eb;
            color: white;
            font-size: 12pt;
            font-weight: bold;
        }

        .notes {
            background-color: #f8f9fa;
            padding: 12px;
            margin: 12px 0;
            border-radius: 4px;
            border-left: 4px solid #2563eb;
        }

        .notes h3 {
            margin-top: 0;
            font-size: 11pt;
            color: #2563eb;
        }

        .notes ul {
            margin: 6px 0;
            padding-left: 18px;
        }

        .notes li {
            margin-bottom: 3px;
            font-size: 9pt;
        }

        .terms {
            margin-top: 16px;
        }

        .terms h3 {
            font-size: 11pt;
            color: #2563eb;
            margin-bottom: 8px;
        }

        .bank-table {
            width: 70%;
            margin-top: 8px;
        }

        .bank-table th {
            background-color: #e3f2fd;
            font-size: 9pt;
        }

        .bank-table td {
            font-size: 9pt;
        }

        .signature-section {
            margin-top: 32px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
        }

        .signature-box {
            border-top: 1px solid #333;
            padding-top: 8px;
            text-align: center;
            font-size: 10pt;
        }

        .page-number {
            position: fixed;
            bottom: 10mm;
            right: 10mm;
            font-size: 9pt;
            color: #666;
        }

        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header print-header" id="doc-header" style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;">
        <div style="text-align:left;">
            ${(() => {
              const logo = localStorage.getItem("company.logo");
              return logo
                ? `<img src="${logo}" alt="Logo" style="max-width:120px;max-height:60px;object-fit:contain;"/>`
                : `<div style='font-weight:bold;color:#999'>Company Logo</div>`;
            })()}
        </div>
        <div>
          <div class="company-name">PROTOFORGELABS PRIVATE LIMITED</div>
          <div class="quotation-title">QUOTATION</div>
        </div>
        <div class="quotation-info" style="text-align:right;">
            <strong>Quotation No:</strong> ${quotationNumber}<br/>
            <strong>Date:</strong> ${formatDate(currentDate)}<br/>
            <strong>Time:</strong> ${formatTime(currentDate)}
        </div>
    </div>

    <div class="info-grid">
        <div class="info-section">
            <h3>Bill To:</h3>
            <div class="info-content">
                <strong>${quotationData.clientInfo.name}</strong><br>
                ${quotationData.clientInfo.gstNumber ? `GST: ${quotationData.clientInfo.gstNumber}<br>` : ""}
                ${quotationData.clientInfo.billingAddress.replace(/\n/g, "<br>")}
            </div>
        </div>
        
        <div class="info-section">
            <h3>Ship To:</h3>
            <div class="info-content">
                ${
                  quotationData.clientInfo.shippingAddress
                    ? quotationData.clientInfo.shippingAddress.replace(
                        /\n/g,
                        "<br>",
                      )
                    : quotationData.clientInfo.billingAddress.replace(
                        /\n/g,
                        "<br>",
                      )
                }
            </div>
        </div>
    </div>

    <table style="table-layout:fixed;">
        <colgroup>
          <col style="width:22px"/>
          <col style="width:52px"/>
          <col />
          <col style="width:55px"/>
          <col style="width:70px"/>
          <col style="width:50px"/>
          <col style="width:32px"/>
          <col style="width:60px"/>
          <col style="width:60px"/>
          <col style="width:70px"/>
        </colgroup>
        <thead>
            <tr>
                <th>S.No</th>
                <th>Preview</th>
                <th>Item Description</th>
                <th>Type</th>
                <th>Material</th>
                <th>Finish</th>
                <th>Qty</th>
                <th>Volume (cm³)</th>
                <th>Weight (g)</th>
                <th>Amount (₹)</th>
            </tr>
        </thead>
        <tbody>
            ${quotationData.files
              .map((file: any, index: number) => {
                const rawName =
                  file?.file?.name ||
                  file?.name ||
                  file?.fileName ||
                  file?.originalName ||
                  "Item";
                const name = String(rawName);
                const truncated =
                  name.length > 40 ? name.slice(0, 37) + "…" : name;
                return `
                <tr>
                    <td style="text-align: center;">${index + 1}</td>
                    <td class="thumbnail-cell">
                        <img src="${file.thumbnail || ""}" alt="Preview" class="thumbnail-img" onerror="this.style.display='none'"/>
                    </td>
                    <td>
                      <div title="${name}">${truncated}</div>
                      ${name.length > 40 ? `<div class="filename-full">${name}</div>` : ""}
                    </td>
                    <td style="text-align: center;">${(file.printType || "").toString().toUpperCase()}</td>
                    <td>${file.material || ""}</td>
                    <td>${file.finish || ""}</td>
                    <td style="text-align: center;">${Number(file.quantity || 0)}</td>
                    <td style="text-align: right;">${Number(file.volume || 0).toFixed(2)}</td>
                    <td style="text-align: right;">${Number(file.weight || 0).toFixed(2)}</td>
                    <td style="text-align: right;">₹${Number(file.estimatedCost || 0).toLocaleString("en-IN")}</td>
                </tr>`;
              })
              .join("")}
            <tr class="total-row">
                <td colspan="9"><strong>Subtotal</strong></td>
                <td style="text-align: right;"><strong>₹${subtotal.toLocaleString("en-IN")}</strong></td>
            </tr>
            ${
              regularDiscountAmount > 0 || volumeDiscountAmount > 0
                ? `
                ${
                  regularDiscountAmount > 0
                    ? `
                    <tr class="discount-row">
                        <td colspan="9">Discount (${discountSettings.percentage}%)</td>
                        <td style="text-align: right;">- ₹${regularDiscountAmount.toLocaleString("en-IN")}</td>
                    </tr>
                `
                    : ""
                }
                ${
                  volumeDiscountAmount > 0
                    ? `
                    <tr class="discount-row">
                        <td colspan="9">Volume Discount ${appliedVolumeDiscount}</td>
                        <td style="text-align: right;">- ₹${volumeDiscountAmount.toLocaleString("en-IN")}</td>
                    </tr>
                `
                    : ""
                }
                <tr class="total-row">
                    <td colspan="9"><strong>After Discount</strong></td>
                    <td style="text-align: right;"><strong>₹${afterDiscount.toLocaleString("en-IN")}</strong></td>
                </tr>
            `
                : ""
            }
            ${
              quotationData.charges.igst > 0
                ? `
                <tr>
                    <td colspan="9">IGST (${quotationData.charges.igst}%)</td>
                    <td style="text-align: right;">₹${igstAmount.toLocaleString("en-IN")}</td>
                </tr>
            `
                : `
                <tr>
                    <td colspan="9">CGST (${quotationData.charges.cgst}%)</td>
                    <td style="text-align: right;">₹${cgstAmount.toLocaleString("en-IN")}</td>
                </tr>
                <tr>
                    <td colspan="9">SGST (${quotationData.charges.sgst}%)</td>
                    <td style="text-align: right;">₹${sgstAmount.toLocaleString("en-IN")}</td>
                </tr>
            `
            }
            ${(() => {
              const enabled = JSON.parse(
                localStorage.getItem("additionalChargesEnabled") || "true",
              );
              return enabled
                ? `
            <tr>
                <td colspan="9">Packaging Charges</td>
                <td style="text-align: right;">₹${quotationData.charges.packagingCharges.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
                <td colspan="9">Courier Charges</td>
                <td style="text-align: right;">₹${quotationData.charges.courierCharges.toLocaleString("en-IN")}</td>
            </tr>`
                : `<tr><td colspan="10" style="color:#555">Note: Shipping charges at actual</td></tr>`;
            })()}
            <tr class="grand-total">
                <td colspan="9"><strong>GRAND TOTAL</strong></td>
                <td style="text-align: right;"><strong>₹${grandTotal.toLocaleString("en-IN")}</strong></td>
            </tr>
        </tbody>
    </table>

    <div class="notes">
        <h3>Quotation Summary</h3>
        <ul>
          <li>Subtotal: ₹${subtotal.toLocaleString("en-IN")}</li>
          ${regularDiscountAmount > 0 ? `<li>Regular Discount: -₹${regularDiscountAmount.toLocaleString("en-IN")}</li>` : ""}
          ${volumeDiscountAmount > 0 ? `<li>Volume Discount: -₹${volumeDiscountAmount.toLocaleString("en-IN")}</li>` : ""}
          <li>Tax: ₹${totalTax.toLocaleString("en-IN")}</li>
          ${(() => {
            const enabled = JSON.parse(
              localStorage.getItem("additionalChargesEnabled") || "true",
            );
            return enabled
              ? `<li>Packaging: ₹${quotationData.charges.packagingCharges.toLocaleString("en-IN")}</li><li>Courier: ₹${quotationData.charges.courierCharges.toLocaleString("en-IN")}</li>`
              : `<li>Shipping charges at actual</li>`;
          })()}
          <li><strong>Grand Total: ₹${grandTotal.toLocaleString("en-IN")}</strong></li>
        </ul>
    </div>

    <div class="notes">
        <h3>Manufacturing Accuracy (Default until stated otherwise):</h3>
        <ul>
            ${Object.values(manufacturingAccuracy)
              .map((accuracy) => `<li>${accuracy}</li>`)
              .join("")}
        </ul>
    </div>

    <div class="terms">
        <h3>Terms & Conditions:</h3>
        <p><strong>Payment Terms:</strong> 100% Advance</p>
        
        <h3>Bank Transfer Details:</h3>
        <table class="bank-table">
            <tr><th>Account Name:</th><td>${finalBankDetails.accountName}</td></tr>
            <tr><th>A/c No:</th><td>${finalBankDetails.accountNumber}</td></tr>
            <tr><th>IFSC Code:</th><td>${finalBankDetails.ifscCode}</td></tr>
            <tr><th>Swift Code:</th><td>${finalBankDetails.swiftCode}</td></tr>
            <tr><th>Bank Name:</th><td>${finalBankDetails.bankName}</td></tr>
            <tr><th>Branch Name:</th><td>${finalBankDetails.branchName}</td></tr>
        </table>
    </div>

    <div class="signature-section">
        <div class="signature-box">
            Customer Signature
        </div>
        <div class="signature-box">
            Authorized Signatory<br>
            <strong>Protoforgelabs Pvt. Ltd.</strong>
        </div>
    </div>

    <script>
        window.onload = function() {
            // Auto-trigger print dialog
            setTimeout(() => {
                window.print();
                // Close the window after printing
                setTimeout(() => {
                    window.close();
                }, 1000);
            }, 500);
        };
    </script>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Handle window close
    printWindow.onbeforeunload = () => {
      resolve();
    };
  });
};

export default generateQuotationPDF;
