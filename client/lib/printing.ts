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
  const calculatedPrice = materialCost * finishMultiplier * quantity;
  const minimumPriceSettings = localStorage.getItem("minimumPriceSettings");
  const settings = minimumPriceSettings
    ? JSON.parse(minimumPriceSettings)
    : { enabled: true, amount: 200 };
  return Math.round(
    settings.enabled
      ? Math.max(calculatedPrice, settings.amount)
      : calculatedPrice,
  );
}
