"use client";

import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * LogoShowcase Component
 * 
 * Display all available logos for the Expense Tracker app.
 * Use this component to preview and test logo variations.
 * 
 * Usage:
 * Import this component in any page to see the logo suite:
 * ```tsx
 * import LogoShowcase from '@/components/LogoShowcase';
 * <LogoShowcase />
 * ```
 */
export default function LogoShowcase() {
  const logos = [
    {
      name: "Full Logo",
      file: "/logo.svg",
      size: 512,
      displaySize: 200,
      description: "Complete logo with all elements. Use for marketing, splash screens, and large displays.",
      useCases: ["Marketing Materials", "Splash Screens", "Hero Sections", "Large Displays"],
    },
    {
      name: "App Icon",
      file: "/logo-icon.svg",
      size: 256,
      displaySize: 150,
      description: "App icon version with rounded corners. Perfect for iOS/Android app icons and social media.",
      useCases: ["App Icons", "Social Media", "Profile Pictures", "Medium Displays"],
    },
    {
      name: "Simple Logo",
      file: "/logo-simple.svg",
      size: 200,
      displaySize: 120,
      description: "Minimal wallet design. Ideal for headers, navigation bars, and compact spaces.",
      useCases: ["Navigation Bar", "Headers", "Compact Spaces", "Sidebar"],
    },
    {
      name: "Favicon",
      file: "/favicon-custom.svg",
      size: 32,
      displaySize: 64,
      description: "Tiny favicon version. Optimized for browser tabs and bookmarks.",
      useCases: ["Browser Tabs", "Bookmarks", "Small Icons", "Mobile Menu"],
    },
  ];

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Expense Tracker Logo Suite
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          A complete set of custom SVG logos designed specifically for your expense tracking application.
          Each variation is optimized for different use cases.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {logos.map((logo) => (
          <Card key={logo.file} className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {logo.name}
                <span className="text-sm font-normal text-gray-500">
                  {logo.size}×{logo.size}px
                </span>
              </CardTitle>
              <CardDescription>{logo.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Logo Display */}
              <div className="flex justify-center items-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 mb-4">
                <Image
                  src={logo.file}
                  alt={logo.name}
                  width={logo.displaySize}
                  height={logo.displaySize}
                  className="drop-shadow-lg"
                />
              </div>

              {/* Dark Background Preview */}
              <div className="flex justify-center items-center bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 mb-4">
                <Image
                  src={logo.file}
                  alt={`${logo.name} on dark background`}
                  width={logo.displaySize * 0.7}
                  height={logo.displaySize * 0.7}
                  className="drop-shadow-lg"
                />
              </div>

              {/* Use Cases */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Use Cases:</p>
                <div className="flex flex-wrap gap-2">
                  {logo.useCases.map((useCase) => (
                    <span
                      key={useCase}
                      className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-full"
                    >
                      {useCase}
                    </span>
                  ))}
                </div>
              </div>

              {/* File Path */}
              <div className="mt-4 p-3 bg-gray-100 rounded font-mono text-xs text-gray-700">
                {logo.file}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Example</CardTitle>
          <CardDescription>
            How to use these logos in your components
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold mb-2">In Next.js/React:</p>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              {`import Image from 'next/image';

// Navbar example
<Image 
  src="/logo-simple.svg" 
  alt="Expense Tracker" 
  width={40} 
  height={40}
/>

// Hero section
<Image 
  src="/logo.svg" 
  alt="Expense Tracker" 
  width={200} 
  height={200}
  priority
/>`}
            </pre>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">In HTML:</p>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              {`<!-- In your head section -->
<link rel="icon" href="/favicon-custom.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/logo-icon.svg">

<!-- In your page -->
<img src="/logo-simple.svg" alt="Expense Tracker" class="h-10 w-10">`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Color Palette */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Color Palette</CardTitle>
          <CardDescription>
            Colors used in the logo suite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: "Indigo", color: "#6366f1", usage: "Primary Gradient Start" },
              { name: "Purple", color: "#a855f7", usage: "Primary Gradient End" },
              { name: "Green", color: "#10b981", usage: "Income/Growth" },
              { name: "Blue", color: "#3b82f6", usage: "Info/Neutral" },
              { name: "Orange", color: "#f59e0b", usage: "Warning" },
              { name: "Red", color: "#ef4444", usage: "Expense/Decline" },
              { name: "Violet", color: "#8b5cf6", usage: "Accent" },
            ].map((color) => (
              <div key={color.name} className="text-center">
                <div
                  className="w-full h-20 rounded-lg mb-2 shadow-md"
                  style={{ backgroundColor: color.color }}
                />
                <p className="text-sm font-semibold">{color.name}</p>
                <p className="text-xs text-gray-600">{color.color}</p>
                <p className="text-xs text-gray-500 italic">{color.usage}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
