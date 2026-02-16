"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface StatusChartProps {
  data: { name: string; value: number; color: string }[];
}

export default function StatusChart({ data }: StatusChartProps) {
  return (
    <div className="bg-[#141415] border border-[#2A2A2D] rounded-xl p-6">
      <h3 className="text-sm font-medium text-[#FAFAFA] mb-4">Success Rate</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1A1A1C",
                border: "1px solid #2A2A2D",
                borderRadius: "8px",
                color: "#FAFAFA",
                fontSize: "12px",
              }}
              formatter={(value: any, name: any) => [value, name]}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span style={{ color: "#A1A1AA", fontSize: "12px" }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
