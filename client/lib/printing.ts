export type PrintType = "fdm" | "sla" | "metal";

export interface MaterialEntry {
  value: string;
  label: string;
  density: number; // g/cm^3
  pricePerGram: number; // INR per gram
}

export interface FinishEntry {
  value: string;
  label: string;
  priceMultiplier: number;
}

export const PRINT_TYPES: { value: PrintType; label: string }[] = [
  { value: "fdm", label: "FDM" },
  { value: "sla", label: "SLA" },
  { value: "metal", label: "Metal" },
];

export const MATERIALS: Record<PrintType, MaterialEntry[]> = {
  fdm: [
    { value: "pla", label: "PLA", density: 1.24, pricePerGram: 8 },
    { value: "abs", label: "ABS", density: 1.175, pricePerGram: 12 },
    { value: "petg", label: "PETG", density: 1.27, pricePerGram: 15 },
  ],
  sla: [
    { value: "abs_alike", label: "ABS Alike", density: 1.1, pricePerGram: 12 },
    {
      value: "clear_transparent",
      label: "Clear Transparent",
      density: 1.05,
      pricePerGram: 12,
    },
    {
      value: "black_8k_brittle",
      label: "Black 8K Brittle",
      density: 1.15,
      pricePerGram: 12,
    },
  ],
  metal: [
    {
      value: "stainless_steel",
      label: "Stainless Steel",
      density: 7.9,
      pricePerGram: 180,
    },
    { value: "aluminum", label: "Aluminum", density: 2.7, pricePerGram: 120 },
    { value: "titanium", label: "Titanium", density: 4.5, pricePerGram: 850 },
  ],
};

export const FINISHES: FinishEntry[] = [
  { value: "standard", label: "Standard", priceMultiplier: 1.0 },
  { value: "smooth", label: "Smooth", priceMultiplier: 1.3 },
  { value: "painted", label: "Painted", priceMultiplier: 1.8 },
];

export function calculateWeight(
  volumeCm3: number,
  printType: PrintType,
  material: string,
): number {
  const materialData = MATERIALS[printType]?.find((m) => m.value === material);
  const density = materialData?.density ?? 1.175; // default ABS density
  return Math.round(volumeCm3 * density * 100) / 100;
}

export function calculateEstimatedCost(
  volume: number,
  weight: number,
  printType: PrintType,
  material: string,
  finish: string,
  quantity: number,
): number {
  const materialData = MATERIALS[printType]?.find((m) => m.value === material);
  const pricePerGram = materialData?.pricePerGram ?? 12;
  const materialCost = weight * pricePerGram;
  const finishMultiplier =
    FINISHES.find((f) => f.value === finish)?.priceMultiplier ?? 1;

  let calculatedPrice = materialCost * finishMultiplier * quantity;

  // --- Discount Logic ---
  // 1. Minimum Price Validation
  const minimumPriceSettings = localStorage.getItem("minimumPriceSettings");
  const minSettings = minimumPriceSettings
    ? JSON.parse(minimumPriceSettings)
    : { enabled: true, amount: 200 };

  if (minSettings.enabled) {
    calculatedPrice = Math.max(calculatedPrice, minSettings.amount);
  }

  // 2. Volume/Quantity Discount Slabs
  // Calculate total volume for this line item to verify discount eligibility
  // (In a real app, this might sum across all cart items, but per-item volume discount is a good start)
  const totalVolume = volume * quantity;

  let slabs: any[] = [];
  const volumeDiscountSlabs = localStorage.getItem("volumeDiscountSlabs");

  if (volumeDiscountSlabs) {
    slabs = JSON.parse(volumeDiscountSlabs);
  } else {
    // Default slabs (same as Admin.tsx defaults)
    slabs = [
      { id: "1", minVolume: 2000, discount: 5, label: "Large Order" },
      { id: "2", minVolume: 4000, discount: 10, label: "Bulk Order" },
      { id: "3", minVolume: 8000, discount: 15, label: "Enterprise Order" },
    ];
  }

  if (slabs.length > 0) {
    // Find the highest applicable discount slab
    // Sort desc by minVolume just in case
    const sortedSlabs = slabs.sort((a: any, b: any) => b.minVolume - a.minVolume);

    for (const slab of sortedSlabs) {
      if (totalVolume >= slab.minVolume) {
        const discountAmount = calculatedPrice * (slab.discount / 100);
        calculatedPrice -= discountAmount;
        break; // Apply only the highest tier
      }
    }
  }

  return Math.round(calculatedPrice);
}
