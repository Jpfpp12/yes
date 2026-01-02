import React from "react";
import { cn } from "@/lib/utils";

interface OptionSelectorProps {
    label: string;
    options: { label: string; value: string }[];
    selected: string;
    onChange: (value: string) => void;
    className?: string;
}

export function OptionSelector({
    label,
    options,
    selected,
    onChange,
    className,
}: OptionSelectorProps) {
    return (
        <div className={cn("space-y-2", className)}>
            <h3 className="font-bold font-mono text-sm uppercase text-gray-900">
                {label}
            </h3>
            <div className="grid grid-cols-2 gap-4">
                {options.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "h-12 border border-gray-200 font-bold font-mono text-sm uppercase transition-all",
                            selected === option.value
                                ? "bg-primary text-white border-primary"
                                : "bg-white text-gray-900 hover:border-gray-400",
                        )}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
