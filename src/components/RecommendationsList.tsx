"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Recommendation } from "@/lib/types";
import { Progress } from "./ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Building, Leaf, Shield } from "lucide-react";

const getDepartmentIcon = (department: string) => {
  if (department.toLowerCase().includes("planning")) return <Building className="w-4 h-4 text-muted-foreground" />;
  if (department.toLowerCase().includes("parks")) return <Leaf className="w-4 h-4 text-muted-foreground" />;
  if (department.toLowerCase().includes("risk")) return <Shield className="w-4 h-4 text-muted-foreground" />;
  return <Building className="w-4 h-4 text-muted-foreground" />;
}

export default function RecommendationsList({
  recommendations,
  isLoading,
}: {
  recommendations: Recommendation[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 border rounded-lg">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2 mt-1" />
          </div>
        ))}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No recommendations available for this tile.
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
      {recommendations.map((rec, index) => (
        <AccordionItem value={`item-${index}`} key={index}>
          <AccordionTrigger className="text-sm font-semibold hover:no-underline">
            {rec.action}
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm text-muted-foreground">
            <p>{rec.rationale}</p>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {getDepartmentIcon(rec.department)}
                <span>{rec.department}</span>
              </div>
              <div className="flex items-center gap-2 w-1/3">
                  <Progress value={rec.confidence * 100} className="h-2" />
                  <span>{(rec.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
