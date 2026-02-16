"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CostChartProps {
  data: { date: string; cost: number }[];
}

export default function CostChart({ data }: CostChartProps) {
  return (
    <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
      <h3 className="text-sm font-medium text-[#FAFAFA] mb-4">Cost Over Time</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2D" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#A1A1AA", fontSize: 12 }}
              axisLine={{ stroke: "#2A2A2D" }}
              tickLine={{ stroke: "#2A2A2D" }}
            />
            <YAxis
              tick={{ fill: "#A1A1AA", fontSize: 12 }}
              axisLine={{ stroke: "#2A2A2D" }}
              tickLine={{ stroke: "#2A2A2D" }}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1A1A1C",
                border: "1px solid #2A2A2D",
                borderRadius: "8px",
                color: "#FAFAFA",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#A1A1AA" }}
              formatter={(value: any) => [`$${Number(value).toFixed(4)}`, "Cost"]}
            />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#7C3AED"
              strokeWidth={2}
              dot={{ fill: "#7C3AED", r: 3, strokeWidth: 0 }}
              activeDot={{ fill: "#7C3AED", r: 5, strokeWidth: 2, stroke: "#FAFAFA" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
