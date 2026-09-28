"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ChartPoint {
  label: string;
  value: number;
}

export function ProgressChart({ points, suffix = "" }: { points: ChartPoint[]; suffix?: string }) {
  if (points.length === 0) {
    return <p className="px-2 py-10 text-center text-sm text-[var(--muted)]">No sessions in this range.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "#9b9ba4", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "#9b9ba4", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(value) => [`${value ?? ""}${suffix ? ` ${suffix}` : ""}`, ""]}
            contentStyle={{
              background: "#17171c",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              color: "#f5f5f6",
            }}
            labelStyle={{ color: "#9b9ba4" }}
          />
          <Line type="monotone" dataKey="value" stroke="#d8ff3e" strokeWidth={3} dot={{ r: 2.5, strokeWidth: 0, fill: "#d8ff3e" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
