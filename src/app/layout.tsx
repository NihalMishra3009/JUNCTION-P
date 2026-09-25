import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { AppProvider } from "@/state/AppContext";

export const metadata: Metadata = {
  title: "JUNCTION — Orchestrating Every Journey",
  description: "Intelligent event-driven destination orchestration platform. Understand destination pressure, predict bottlenecks, simulate interventions, and help organizers and attendees make better decisions.",
  keywords: ["event management", "crowd management", "destination intelligence", "journey planning", "Mumbai IPL"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClerkProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
