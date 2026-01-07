import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateQuotePDF = (
    files: any[],
    charges: any,
    clientInfo: any,
    totalCost: number,
    bankDetails: any = {},
    discountApplied: any = { amount: 0, label: "", percent: 0 }
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const primaryColor: [number, number, number] = [255, 87, 34]; // #FF5722

    // --- Header ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(36);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("INVOICE", margin, 25);

    // Company Info (Right Aligned)
    doc.setFontSize(14);
    doc.text("ProtoFast Inc.", pageWidth - margin, 20, { align: "right" });

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("123 Innovation Dr, Tech Park", pageWidth - margin, 25, { align: "right" });
    doc.text("Mumbai, MH 400001", pageWidth - margin, 29, { align: "right" });
    doc.text("support@protofast.com", pageWidth - margin, 33, { align: "right" });

    // Separator
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 38, pageWidth - margin, 38);

    // --- Billing Info Section ---
    const infoY = 50;

    // Billed To
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Billed to:", margin, infoY);

    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    doc.setFont("helvetica", "bold");
    doc.text(clientInfo.name || "Valued Customer", margin, infoY + 6);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(clientInfo.email || "", margin, infoY + 11);
    doc.text(clientInfo.billingAddress || "", margin, infoY + 15);

    // Bill Info (Middle)
    const midX = pageWidth / 2 - 20;
    doc.text("Bill Info", midX, infoY);

    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    doc.setFont("helvetica", "bold");
    const quoteId = `QT-${Date.now().toString().slice(-6)}`;
    doc.text(quoteId, midX, infoY + 6);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, midX, infoY + 11);

    // Total Due Box (Right) - Solid Orange
    const boxWidth = 60;
    const boxHeight = 20;
    const boxX = pageWidth - margin - boxWidth;
    const boxY = infoY - 5;

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(boxX, boxY, boxWidth, boxHeight, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("Total Due:", boxX + 5, boxY + 7);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Rs. ${totalCost}`, boxX + 5, boxY + 16);

    // --- Table ---
    const tableRows = files.map((file, index) => [
        index + 1,
        `${file.file.name}\n${file.printType.toUpperCase()} - ${file.material.toUpperCase()} | ${file.volume.toFixed(2)} cm³`,
        file.quantity,
        `Rs. ${(file.estimatedCost / file.quantity).toFixed(0)}`,
        `Rs. ${file.estimatedCost}`
    ]);

    autoTable(doc, {
        startY: 80,
        head: [["No", "Description", "Qty", "Price", "Total"]],
        body: tableRows,
        theme: 'grid',
        headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: 'left',
            cellPadding: 4
        },
        styles: {
            fontSize: 9,
            cellPadding: 4,
            valign: 'middle',
            textColor: [33, 33, 33],
            lineWidth: 0.1,
            lineColor: [220, 220, 220]
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 30, halign: 'right' }
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250]
        }
    });

    // --- Summary & Footer ---
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Left Side: Notes & Bank Info
    const leftX = margin;
    const bottomStart = Math.max(finalY + 10, pageHeight - 90);

    // Payment Information
    doc.setFontSize(10);
    doc.setTextColor(33, 33, 33);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Information", leftX, bottomStart);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);

    if (bankDetails.accountName || bankDetails.accountNumber) {
        doc.text(`Bank Name:    ${bankDetails.bankName || "-"}`, leftX, bottomStart + 6);
        doc.text(`Account No:   ${bankDetails.accountNumber || "-"}`, leftX, bottomStart + 11);
        doc.text(`IFSC Code:    ${bankDetails.ifscCode || "-"}`, leftX, bottomStart + 16);
        doc.text(`Account Name: ${bankDetails.accountName || "-"}`, leftX, bottomStart + 21);
    } else {
        doc.text("No bank details available.", leftX, bottomStart + 6);
    }

    // Terms
    doc.setFontSize(10);
    doc.setTextColor(33, 33, 33);
    doc.setFont("helvetica", "bold");
    doc.text("Terms & Conditions", leftX, bottomStart + 35);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Payment is due within 7 days.", leftX, bottomStart + 40);
    doc.text("Please make checks payable to ProtoFast Inc.", leftX, bottomStart + 44);

    // Right Side: Totals
    const rightX = pageWidth - margin - 70;
    let currentY = finalY;

    // Helper for rows
    const addTotalRow = (label: string, value: string) => {
        doc.setFontSize(10);
        doc.setTextColor(33, 33, 33);
        doc.setFont("helvetica", "normal");
        doc.text(label, rightX, currentY);
        doc.text(value, pageWidth - margin, currentY, { align: "right" });
        currentY += 8;
    };

    const subtotal = files.reduce((acc, f) => acc + f.estimatedCost, 0);
    addTotalRow("Sub-Total", `Rs. ${subtotal}`);

    if (discountApplied.amount > 0) {
        addTotalRow("Discount", `- Rs. ${Math.round(discountApplied.amount)}`);
    }

    addTotalRow("Packaging & Ship", `Rs. ${charges.packagingCharges + charges.courierCharges}`);

    const taxableValue = subtotal - discountApplied.amount + charges.packagingCharges + charges.courierCharges;
    const taxAmount = (taxableValue * (charges.cgst + charges.sgst + charges.igst)) / 100;
    addTotalRow("Tax (18%)", `Rs. ${Math.round(taxAmount)}`);

    // Total Bar
    currentY += 5;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(rightX - 5, currentY - 5, 80, 12, "F"); // Background

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Total", rightX, currentY + 2);
    doc.text(`Rs. ${totalCost}`, pageWidth - margin, currentY + 2, { align: "right" });

    // Signature Area
    const sigY = bottomStart + 40;
    doc.setDrawColor(33, 33, 33);
    doc.line(pageWidth - margin - 50, sigY, pageWidth - margin, sigY);

    doc.setFontSize(9);
    doc.setTextColor(33, 33, 33);
    doc.setFont("helvetica", "bold");
    doc.text("Finance Manager", pageWidth - margin - 25, sigY + 5, { align: "center" });

    return doc;
};
