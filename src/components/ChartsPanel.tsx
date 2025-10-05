"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TileProperties } from "@/lib/types";

// Mock data for trend charts
const ndviTrendData = [
  { name: "2020", value: 0.38 },
  { name: "2021", value: 0.42 },
  { name: "2022", value: 0.41 },
  { name: "2023", value: 0.45 },
  { name: "2024", value: 0.47 },
];

const lstSuitabilityData = (properties: TileProperties) => [
    { name: 'Residential', suitability: properties.residential_suitability, color: 'hsl(var(--chart-2))' },
    { name: 'Industrial', suitability: properties.industrial_suitability, color: 'hsl(var(--chart-4))' },
];


const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col space-y-1">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {label || payload[0].name}
            </span>
            <span className="font-bold text-muted-foreground">
              {payload[0].value.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function ChartsPanel({
  properties,
}: {
  properties: TileProperties;
}) {

  const currentNdviData = [...ndviTrendData];
  currentNdviData[currentNdviData.length -1] = {name: '2024', value: properties.ndvi_mean};
  const suitabilityData = lstSuitabilityData(properties);


  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">NDVI Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={currentNdviData}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 1]}/>
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Land Use Suitability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={suitabilityData} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <XAxis type="number" hide domain={[0, 1]}/>
                <YAxis type="category" dataKey="name" hide/>
                <Tooltip cursor={{fill: 'transparent'}} content={<CustomTooltip />} />
                <Bar dataKey="suitability" barSize={20} radius={[4, 4, 4, 4]}>
                    {suitabilityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
