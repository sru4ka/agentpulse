"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TokenChartProps {
  data: { model: string; tokens: number }[];
}

export default function TokenChart({ data }: TokenChartProps) {
  return (
    <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
      <h3 className="text-sm font-medium text-[#FAFAFA] mb-4">Tokens by Model</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2D" vertical={false} />
            <XAxis
              dataKey="model"
              tick={{ fill: "#A1A1AA", fontSize: 12 }}
              axisLine={{ stroke: "#2A2A2D" }}
              tickLine={{ stroke: "#2A2A2D" }}
            />
            <YAxis
              tick={{ fill: "#A1A1AA", fontSize: 12 }}
              axisLine={{ stroke: "#2A2A2D" }}
              tickLine={{ stroke: "#2A2A2D" }}
              tickFormatter={(value) =>
                value >= 1_000_000
                  ? `${(value / 1_000_000).toFixed(1)}M`
                  : value >= 1_000
                    ? `${(value / 1_000).toFixed(0)}K`
                    : `${value}`
              }
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
              formatter={(value: any) => [Number(value).toLocaleString(), "Tokens"]}
            />
            <Bar
              dataKey="tokens"
              fill="#7C3AED"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
