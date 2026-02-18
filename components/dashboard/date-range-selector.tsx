"use client";

import { useState } from "react";

export type DateRange = "today" | "7d" | "30d" | "90d" | "custom";

export interface DateRangeResult {
  range: DateRange;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  label: string;
}

export function getDateRange(range: DateRange, customFrom?: string, customTo?: string): DateRangeResult {
  const now = new Date();
  const to = now.toISOString().split("T")[0];

  switch (range) {
    case "today":
      return { range, from: to, to, label: "Today" };
    case "7d": {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return { range, from: d.toISOString().split("T")[0], to, label: "Last 7 days" };
    }
    case "30d": {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return { range, from: d.toISOString().split("T")[0], to, label: "Last 30 days" };
    }
    case "90d": {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      return { range, from: d.toISOString().split("T")[0], to, label: "Last 90 days" };
    }
    case "custom":
      return { range, from: customFrom || to, to: customTo || to, label: "Custom" };
  }
}

const OPTIONS: { value: DateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "custom", label: "Custom" },
];

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (result: DateRangeResult) => void;
}

export default function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-0.5 bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-0.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              if (opt.value === "custom") {
                const today = new Date().toISOString().split("T")[0];
                const from = customFrom || today;
                const to = customTo || today;
                setCustomFrom(from);
                setCustomTo(to);
                onChange(getDateRange("custom", from, to));
              } else {
                onChange(getDateRange(opt.value));
              }
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              value === opt.value
                ? "bg-[#7C3AED] text-white"
                : "text-[#A1A1AA] hover:text-[#FAFAFA]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {value === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => {
              setCustomFrom(e.target.value);
              onChange(getDateRange("custom", e.target.value, customTo));
            }}
            className="bg-[#141415] border border-[#2A2A2D] rounded-lg px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED] [color-scheme:dark]"
          />
          <span className="text-xs text-[#A1A1AA]">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value);
              onChange(getDateRange("custom", customFrom, e.target.value));
            }}
            className="bg-[#141415] border border-[#2A2A2D] rounded-lg px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED] [color-scheme:dark]"
          />
        </div>
      )}
    </div>
  );
}
