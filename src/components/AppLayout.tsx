"use client";
import React from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import { useAppContext } from "@/context/AppContext";
import Header from "@/components/Header";
import SidePanel from "@/components/SidePanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "./ui/button";
import { Layers } from "lucide-react";
import dynamic from "next/dynamic";
import { Skeleton } from "./ui/skeleton";
import MapLoader from "./MapLoader";

const AppSidebar = dynamic(() => import("@/components/Sidebar"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

export default function AppLayout() {
  const { isSidebarOpen, setSidebarOpen, selectedTile } = useAppContext();
  const isMobile = useIsMobile();

  return (
    <SidebarProvider open={isSidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="flex h-screen w-full flex-col bg-background">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            collapsible="icon"
            variant="sidebar"
            className="border-r border-border"
          >
            <AppSidebar />
          </Sidebar>
          <SidebarInset className="relative flex-1">
            <MapLoader />
            {isMobile && !selectedTile && (
              <div className="absolute bottom-6 right-6 z-[49]">
                 <Button size="icon" className="w-14 h-14 rounded-full shadow-lg" aria-label="Toggle Layers">
                    <Layers className="w-6 h-6" />
                </Button>
              </div>
            )}
          </SidebarInset>
        </div>
        <SidePanel />
      </div>
    </SidebarProvider>
  );
}
