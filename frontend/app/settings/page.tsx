"use client";
import { ThemeCustomizer } from "@/app/components/settings/ThemeCustomizer";
import { PipelineSettings } from "@/app/components/settings/PipelineSettings";
import { APIKeyChecker } from "@/app/components/settings/APIKeyChecker";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/app/components/ui/tabs";
import { Palette, Sliders, Key } from "lucide-react";

export default function SettingsPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Configure the pipeline, appearance, and API keys.
          </p>
        </div>

        <Tabs defaultValue="theme">
          <TabsList className="mb-6">
            <TabsTrigger value="theme">
              <Palette size={14} className="mr-1.5" />
              Theme
            </TabsTrigger>
            <TabsTrigger value="pipeline">
              <Sliders size={14} className="mr-1.5" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="api">
              <Key size={14} className="mr-1.5" />
              API Keys
            </TabsTrigger>
          </TabsList>

          <TabsContent value="theme">
            <ThemeCustomizer />
          </TabsContent>

          <TabsContent value="pipeline">
            <PipelineSettings />
          </TabsContent>

          <TabsContent value="api">
            <APIKeyChecker />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
