import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentPulse — AI Agent Observability",
  description: "See everything your AI agent does. Track costs, monitor performance, stop burning money blind.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#0A0A0B] text-[#FAFAFA] antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
