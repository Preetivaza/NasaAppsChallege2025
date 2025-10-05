"use client";

import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const AppLayout = dynamic(() => import("@/components/AppLayout"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

export default function AppLayoutLoader() {
  return <AppLayout />;
}
