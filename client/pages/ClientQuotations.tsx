import React, { useState, useEffect, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Download,
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  RefreshCw,
} from "lucide-react";
import { quotationNumberService } from "@/services/quotationNumberService";
import { generateQuotationPDF } from "@/components/PDFGenerator";
import { useAuth } from "@/hooks/useAuth";

interface QuotationData {
  quotationNumber: string;
  timestamp: string;
  clientInfo: {
    name: string;
    email?: string;
    phone?: string;
    gstNumber?: string;
    billingAddress: string;
    shippingAddress?: string;
  };
  files: any[];
  charges: any;
  status: string;
}

export default function ClientQuotations() {
  const { user, isAuthenticated } = useAuth();
  const [quotations, setQuotations] = useState<QuotationData[]>([]);
  // derived filtered list will be computed using useMemo
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedQuotation, setSelectedQuotation] =
    useState<QuotationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load quotations on component mount
  useEffect(() => {
    loadQuotations();
  }, []);

  const filteredQuotations = useMemo(() => {
    let filtered = [...quotations];

    if (searchTerm) {
      const lowercaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (quotation) =>
          quotation.quotationNumber.toLowerCase().includes(lowercaseSearch) ||
          quotation.clientInfo.name.toLowerCase().includes(lowercaseSearch) ||
          quotation.clientInfo.email?.toLowerCase().includes(lowercaseSearch) ||
          quotation.clientInfo.phone?.toLowerCase().includes(lowercaseSearch) ||
          quotation.clientInfo.billingAddress
            .toLowerCase()
            .includes(lowercaseSearch),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (quotation) => quotation.status === statusFilter,
      );
    }

    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();
      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          break;
        default:
          filterDate.setFullYear(1970);
      }
      filtered = filtered.filter(
        (quotation) => new Date(quotation.timestamp) >= filterDate,
      );
    }

    return filtered;
  }, [quotations, searchTerm, statusFilter, dateFilter]);

  const loadQuotations = () => {
    setIsLoading(true);
    try {
      const allQuotations = quotationNumberService.getAllQuotations();
      setQuotations(
        allQuotations.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        ),
      );
    } catch (error) {
      console.error("Error loading quotations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const calculateQuotationTotal = (quotation: QuotationData) => {
    const subtotal = quotation.files.reduce(
      (sum, file) => sum + file.estimatedCost,
      0,
    );
    const cgstAmount =
      quotation.charges.igst > 0
        ? 0
        : (subtotal * quotation.charges.cgst) / 100;
    const sgstAmount =
      quotation.charges.igst > 0
        ? 0
        : (subtotal * quotation.charges.sgst) / 100;
    const igstAmount =
      quotation.charges.igst > 0
        ? (subtotal * quotation.charges.igst) / 100
        : 0;
    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const totalAfterTax = subtotal + totalTax;
    return (
      totalAfterTax +
      quotation.charges.packagingCharges +
      quotation.charges.courierCharges
    );
  };

  const downloadQuotationPDF = async (quotation: QuotationData) => {
    try {
      const additionalChargesEnabled = JSON.parse(
        localStorage.getItem("additionalChargesEnabled") || "true",
      );
      const quotationData = {
        files: quotation.files,
        clientInfo: quotation.clientInfo,
        charges: additionalChargesEnabled
          ? quotation.charges
          : { ...quotation.charges, packagingCharges: 0, courierCharges: 0 },
        totalCost: quotation.files.reduce(
          (sum, file) => sum + file.estimatedCost,
          0,
        ),
      };

      await generateQuotationPDF(quotationData, quotation.quotationNumber);
    } catch (error) {
      console.error("Error downloading quotation:", error);
      alert("Error downloading quotation PDF. Please try again.");
    }
  };

  const deleteQuotation = (quotationNumber: string) => {
    if (
      confirm(`Are you sure you want to delete quotation ${quotationNumber}?`)
    ) {
      const success = quotationNumberService.deleteQuotation(quotationNumber);
      if (success) {
        loadQuotations();
        alert("Quotation deleted successfully.");
      } else {
        alert("Error deleting quotation.");
      }
    }
  };

  const exportAllQuotations = () => {
    try {
      const data = quotationNumberService.exportQuotationsData();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quotations_export_${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting quotations:", error);
      alert("Error exporting quotations.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Please sign in to access the admin panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/signin">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Client Quotations
                </h1>
                <p className="text-gray-600">
                  View and manage all generated quotations
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={exportAllQuotations}>
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
              <Button onClick={loadQuotations}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search quotations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="generated">Generated</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Results</Label>
                <div className="flex items-center h-10 px-3 border rounded-md bg-gray-50">
                  <span className="text-sm font-medium">
                    {filteredQuotations.length} of {quotations.length}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quotations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Quotations List</CardTitle>
            <CardDescription>
              All generated quotations with client details and actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading quotations...</p>
              </div>
            ) : filteredQuotations.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No quotations found
                </h3>
                <p className="text-gray-600">
                  {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                    ? "Try adjusting your search filters."
                    : "No quotations have been generated yet."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-medium text-gray-700">
                        Quotation #
                      </th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">
                        Date & Time
                      </th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">
                        Client
                      </th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">
                        Contact
                      </th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">
                        Items
                      </th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">
                        Total
                      </th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">
                        Status
                      </th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuotations.map((quotation) => (
                      <tr
                        key={quotation.quotationNumber}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-4 px-2">
                          <div className="font-medium text-blue-600">
                            {quotation.quotationNumber}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="text-sm">
                            {formatDate(quotation.timestamp)}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div>
                            <div className="font-medium text-gray-900">
                              {quotation.clientInfo.name}
                            </div>
                            {quotation.clientInfo.gstNumber && (
                              <div className="text-xs text-gray-500">
                                GST: {quotation.clientInfo.gstNumber}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="text-sm space-y-1">
                            {quotation.clientInfo.email && (
                              <div className="flex items-center">
                                <Mail className="h-3 w-3 mr-1 text-gray-400" />
                                {quotation.clientInfo.email}
                              </div>
                            )}
                            {quotation.clientInfo.phone && (
                              <div className="flex items-center">
                                <Phone className="h-3 w-3 mr-1 text-gray-400" />
                                {quotation.clientInfo.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="text-sm">
                            <div>{quotation.files.length} files</div>
                            <div className="text-xs text-gray-500">
                              {quotation.files.reduce(
                                (sum, file) => sum + file.quantity,
                                0,
                              )}{" "}
                              items
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="font-medium">
                            {formatCurrency(calculateQuotationTotal(quotation))}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <Badge
                            variant={
                              quotation.status === "generated"
                                ? "secondary"
                                : "default"
                            }
                          >
                            {quotation.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex items-center space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setSelectedQuotation(quotation)
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>
                                    Quotation Details -{" "}
                                    {quotation.quotationNumber}
                                  </DialogTitle>
                                </DialogHeader>
                                {selectedQuotation && (
                                  <div className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                      <div>
                                        <h4 className="font-medium mb-2">
                                          Client Information
                                        </h4>
                                        <div className="text-sm space-y-1">
                                          <div>
                                            <strong>Name:</strong>{" "}
                                            {selectedQuotation.clientInfo.name}
                                          </div>
                                          {selectedQuotation.clientInfo
                                            .email && (
                                            <div>
                                              <strong>Email:</strong>{" "}
                                              {
                                                selectedQuotation.clientInfo
                                                  .email
                                              }
                                            </div>
                                          )}
                                          {selectedQuotation.clientInfo
                                            .gstNumber && (
                                            <div>
                                              <strong>GST:</strong>{" "}
                                              {
                                                selectedQuotation.clientInfo
                                                  .gstNumber
                                              }
                                            </div>
                                          )}
                                          <div>
                                            <strong>Address:</strong>{" "}
                                            {
                                              selectedQuotation.clientInfo
                                                .billingAddress
                                            }
                                          </div>
                                        </div>
                                      </div>
                                      <div>
                                        <h4 className="font-medium mb-2">
                                          Quotation Details
                                        </h4>
                                        <div className="text-sm space-y-1">
                                          <div>
                                            <strong>Date:</strong>{" "}
                                            {formatDate(
                                              selectedQuotation.timestamp,
                                            )}
                                          </div>
                                          <div>
                                            <strong>Files:</strong>{" "}
                                            {selectedQuotation.files.length}
                                          </div>
                                          <div>
                                            <strong>Total Items:</strong>{" "}
                                            {selectedQuotation.files.reduce(
                                              (sum, file) =>
                                                sum + file.quantity,
                                              0,
                                            )}
                                          </div>
                                          <div>
                                            <strong>Total:</strong>{" "}
                                            {formatCurrency(
                                              calculateQuotationTotal(
                                                selectedQuotation,
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-2">
                                        Files
                                      </h4>
                                      <div className="space-y-2">
                                        {selectedQuotation.files.map(
                                          (file, index) => (
                                            <div
                                              key={index}
                                              className="flex justify-between items-center p-2 bg-gray-50 rounded"
                                            >
                                              <span className="text-sm">
                                                {file.file.name}
                                              </span>
                                              <span className="text-sm font-medium">
                                                {formatCurrency(
                                                  file.estimatedCost,
                                                )}
                                              </span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadQuotationPDF(quotation)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                deleteQuotation(quotation.quotationNumber)
                              }
                              className="text-red-600 hover:text-red-700"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
