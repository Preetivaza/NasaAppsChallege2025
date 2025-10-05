"use client";
import React from "react";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  Layers,
  LayoutGrid,
  Droplet,
  Thermometer,
  Cloud,
  Mountain,
  AlertTriangle,
  Lightbulb,
  Users,
  FlaskConical,
  BookOpen,
} from "lucide-react";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { getLLMPromptExample } from "@/ai/flows/provide-llm-prompt-example";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const layers = [
  { id: "ndvi", name: "NDVI", icon: LayoutGrid },
  { id: "lst", name: "Land Surface Temp", icon: Thermometer },
  { id: "aod", name: "Aerosol Depth", icon: Cloud },
  { id: "water", name: "Water Occurrence", icon: Droplet },
  { id: "elevation", name: "Elevation", icon: Mountain },
];

const indicators = [
  { id: "flood", name: "Flood Risk", icon: AlertTriangle },
  { id: "nightlight", name: "Nightlight Index", icon: Lightbulb },
  { id: "population", name: "Population Density", icon: Users },
];

export default function AppSidebar() {
  const [promptExample, setPromptExample] = React.useState("");
  const [isPromptModalOpen, setPromptModalOpen] = React.useState(false);

  const handleShowPrompt = async () => {
    const prompt = await getLLMPromptExample();
    setPromptExample(prompt);
    setPromptModalOpen(true);
  };

  return (
    <>
      <SidebarContent className="p-0">
        <SidebarGroup>
          <SidebarGroupLabel>Map Layers</SidebarGroupLabel>
          <SidebarMenu>
            {layers.map((layer) => (
              <SidebarMenuItem key={layer.id}>
                <div className="flex w-full items-center justify-between p-2">
                  <div className="flex items-center gap-2">
                    <layer.icon className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor={`switch-${layer.id}`} className="text-sm">
                      {layer.name}
                    </Label>
                  </div>
                  <Switch id={`switch-${layer.id}`} defaultChecked />
                </div>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <Separator />

        <SidebarGroup>
          <SidebarGroupLabel>Indicators</SidebarGroupLabel>
          <SidebarMenu>
            {indicators.map((indicator) => (
              <SidebarMenuItem key={indicator.id}>
                <div className="flex w-full items-center justify-between p-2">
                  <div className="flex items-center gap-2">
                    <indicator.icon className="h-4 w-4 text-muted-foreground" />
                    <Label
                      htmlFor={`switch-${indicator.id}`}
                      className="text-sm"
                    >
                      {indicator.name}
                    </Label>
                  </div>
                  <Switch id={`switch-${indicator.id}`} defaultChecked />
                </div>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <Separator />

        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleShowPrompt}>
                <FlaskConical />
                <span>Show Prompt</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton>
                <BookOpen />
                <span>Documentation</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <Dialog open={isPromptModalOpen} onOpenChange={setPromptModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>LLM Prompt Example</DialogTitle>
            <DialogDescription>
              This is an example of the prompt used to generate tile
              recommendations.
            </DialogDescription>
          </DialogHeader>
          <pre className="mt-4 w-full rounded-md bg-muted p-4 text-sm overflow-x-auto">
            <code className="font-code text-muted-foreground">{promptExample}</code>
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
