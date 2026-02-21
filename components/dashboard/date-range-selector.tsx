"use client";

import { useState } from "react";

export type DateRange = "today" | "yesterday" | "7d" | "30d" | "90d" | "custom";

export interface DateRangeResult {
  range: DateRange;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  label: string;
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDateRange(range: DateRange, customFrom?: string, customTo?: string): DateRangeResult {
  const now = new Date();
  const to = toLocalDateString(now);

  switch (range) {
    case "today":
      return { range, from: to, to, label: "Today" };
    case "yesterday": {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const y = toLocalDateString(d);
      return { range, from: y, to: y, label: "Yesterday" };
    }
    case "7d": {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return { range, from: toLocalDateString(d), to, label: "Last 7 days" };
    }
    case "30d": {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return { range, from: toLocalDateString(d), to, label: "Last 30 days" };
    }
    case "90d": {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      return { range, from: toLocalDateString(d), to, label: "Last 90 days" };
    }
    case "custom": {
      const f = customFrom || to;
      const t = customTo || to;
      return { range, from: f, to: t, label: f === t ? f : `${f} — ${t}` };
    }
  }
}

const OPTIONS: { value: DateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
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
  const [customFrom, setCustomFrom] = useState(() => toLocalDateString(new Date()));
  const [customTo, setCustomTo] = useState(() => toLocalDateString(new Date()));
  const [pendingCustom, setPendingCustom] = useState(false);

  const applyCustom = (from: string, to: string) => {
    // Swap if from > to
    const f = from <= to ? from : to;
    const t = from <= to ? to : from;
    setCustomFrom(f);
    setCustomTo(t);
    setPendingCustom(false);
    onChange(getDateRange("custom", f, t));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-0.5 bg-[#0A0A0B] border border-[#2A2A2D] rounded-lg p-0.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              if (opt.value === "custom") {
                setPendingCustom(false);
                applyCustom(customFrom, customTo);
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
              setPendingCustom(true);
            }}
            className="bg-[#141415] border border-[#2A2A2D] rounded-lg px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED] [color-scheme:dark]"
          />
          <span className="text-xs text-[#A1A1AA]">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value);
              setPendingCustom(true);
            }}
            className="bg-[#141415] border border-[#2A2A2D] rounded-lg px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#7C3AED] [color-scheme:dark]"
          />
          <button
            onClick={() => applyCustom(customFrom, customTo)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              pendingCustom
                ? "bg-[#7C3AED] text-white"
                : "bg-[#7C3AED]/20 text-[#7C3AED]"
            }`}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
