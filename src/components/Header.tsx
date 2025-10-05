"use client";
import React, { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Map, Download, User, Search, Loader2, PenSquare } from "lucide-react";
import { Input } from "./ui/input";
import { getCityCoordinates } from "@/ai/flows/get-city-coordinates";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";


export default function Header() {
  const { setCityCoordinates, isDrawing, setDrawing } = useAppContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery) return;

      setIsLoading(true);
      try {
        const result = await getCityCoordinates({ city: searchQuery });
        setCityCoordinates({ lat: result.latitude, lng: result.longitude });
        toast({
          title: "Location Updated",
          description: `Map centered on ${searchQuery}.`,
        });
      } catch (error) {
        console.error("Failed to fetch city coordinates:", error);
         toast({
          variant: "destructive",
          title: "Search Failed",
          description: "Could not find coordinates for the specified city.",
        });
      } finally {
        setIsLoading(false);
      }
  }

  return (
    <header className="flex h-16 w-full items-center justify-between border-b bg-background px-4 md:px-6 z-20 shrink-0">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        <Map className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-bold font-headline tracking-tight">
          City Insights Dashboard
        </h1>
      </div>

       <div className="flex items-center gap-4 w-full max-w-md">
         <form onSubmit={handleSearch} className="w-full">
            <div className="relative">
                <Input 
                    placeholder="Search city..." 
                    className="w-full pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button type="submit" variant="ghost" size="icon" className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <Search />}
                </Button>
            </div>
         </form>
         <Button
            variant={isDrawing ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setDrawing(!isDrawing)}
          >
            <PenSquare className="mr-2 h-4 w-4" />
            {isDrawing ? "Drawing..." : "Draw Area"}
          </Button>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="@shadcn" />
                <AvatarFallback>UP</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Urban Planner</p>
                <p className="text-xs leading-none text-muted-foreground">
                  planner@city.gov
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
