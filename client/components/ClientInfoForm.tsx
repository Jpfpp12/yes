import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  gstNumber: string;
  billingAddress: string;
  shippingAddress: string;
  sameAsbilling: boolean;
}

interface QuotationCharges {
  cgst: number;
  sgst: number;
  igst: number;
  packagingCharges: number;
  courierCharges: number;
}

interface ClientInfoFormProps {
  clientInfo: ClientInfo;
  quotationCharges: QuotationCharges;
  onClientInfoChange: (field: keyof ClientInfo, value: any) => void;
  onChargesChange: (field: keyof QuotationCharges, value: number) => void;
}

export default function ClientInfoForm({
  clientInfo,
  quotationCharges,
  onClientInfoChange,
  onChargesChange,
}: ClientInfoFormProps) {
  return (
    <div id="client-info" className="border border-gray-200 bg-white p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold font-mono uppercase">Client Information</h3>
        <p className="text-sm text-gray-500 font-mono mt-1">
          ENTER DETAILS FOR QUOTE GENERATION
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="clientName" className="font-mono text-xs uppercase text-gray-500">Client Name *</Label>
            <Input
              id="clientName"
              value={clientInfo.name}
              onChange={(e) => onClientInfoChange("name", e.target.value)}
              placeholder="ENTER CLIENT NAME"
              className="h-10 border-gray-200 focus:border-primary font-mono text-sm placeholder:text-gray-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientEmail" className="font-mono text-xs uppercase text-gray-500">Email *</Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientInfo.email}
                onChange={(e) => onClientInfoChange("email", e.target.value)}
                placeholder="CLIENT@EXAMPLE.COM"
                className="h-10 border-gray-200 focus:border-primary font-mono text-sm placeholder:text-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPhone" className="font-mono text-xs uppercase text-gray-500">Phone *</Label>
              <Input
                id="clientPhone"
                type="tel"
                value={clientInfo.phone}
                onChange={(e) => onClientInfoChange("phone", e.target.value)}
                placeholder="+91 9876543210"
                className="h-10 border-gray-200 focus:border-primary font-mono text-sm placeholder:text-gray-300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gstNumber" className="font-mono text-xs uppercase text-gray-500">GST Number</Label>
            <Input
              id="gstNumber"
              value={clientInfo.gstNumber}
              onChange={(e) =>
                onClientInfoChange("gstNumber", e.target.value)
              }
              placeholder="ENTER GST NUMBER (OPTIONAL)"
              className="h-10 border-gray-200 focus:border-primary font-mono text-sm placeholder:text-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingAddress" className="font-mono text-xs uppercase text-gray-500">Billing Address *</Label>
            <Textarea
              id="billingAddress"
              value={clientInfo.billingAddress}
              onChange={(e) =>
                onClientInfoChange("billingAddress", e.target.value)
              }
              placeholder="ENTER COMPLETE BILLING ADDRESS"
              rows={3}
              className="border-gray-200 focus:border-primary font-mono text-sm placeholder:text-gray-300 resize-none"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2 pt-8">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sameAsBilling"
                checked={clientInfo.sameAsbilling}
                onChange={(e) =>
                  onClientInfoChange("sameAsbilling", e.target.checked)
                }
                className="rounded-none border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="sameAsBilling" className="font-mono text-xs uppercase cursor-pointer">
                Shipping address same as billing
              </Label>
            </div>
          </div>

          {!clientInfo.sameAsbilling && (
            <div className="space-y-2">
              <Label htmlFor="shippingAddress" className="font-mono text-xs uppercase text-gray-500">Shipping Address *</Label>
              <Textarea
                id="shippingAddress"
                value={clientInfo.shippingAddress}
                onChange={(e) =>
                  onClientInfoChange("shippingAddress", e.target.value)
                }
                placeholder="ENTER SHIPPING ADDRESS"
                rows={3}
                className="border-gray-200 focus:border-primary font-mono text-sm placeholder:text-gray-300 resize-none"
              />
            </div>
          )}

          {/* Editable Charges */}
          <div className="space-y-4 pt-8 border-t border-gray-100 mt-8">
            <h4 className="font-bold font-mono uppercase text-sm">Additional Charges</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="packagingCharges" className="font-mono text-xs uppercase text-gray-500">
                  Packaging Charges (₹)
                </Label>
                <Input
                  id="packagingCharges"
                  type="number"
                  value={quotationCharges.packagingCharges}
                  onChange={(e) =>
                    onChargesChange(
                      "packagingCharges",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="h-10 border-gray-200 focus:border-primary font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="courierCharges" className="font-mono text-xs uppercase text-gray-500">Courier Charges (₹)</Label>
                <Input
                  id="courierCharges"
                  type="number"
                  value={quotationCharges.courierCharges}
                  onChange={(e) =>
                    onChargesChange(
                      "courierCharges",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="h-10 border-gray-200 focus:border-primary font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
