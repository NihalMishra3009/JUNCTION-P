import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/state/AppContext";

export const metadata: Metadata = {
  title: "JUNCTION — Orchestrating Every Journey",
  description: "Intelligent event-driven destination orchestration platform. Understand destination pressure, predict bottlenecks, simulate interventions, and help organizers and attendees make better decisions.",
  keywords: ["event management", "crowd management", "destination intelligence", "journey planning", "Mumbai IPL"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
