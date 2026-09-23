import type { Metadata } from "next";
import localFont from "next/font/local";
import "./dashboard.css";

// Self-hosted local files rather than next/font/google: this repo pins
// next@14.2.35, whose bundled next/font/google catalogue doesn't include
// Geist yet (only Manrope does), and a local font also means no runtime
// request to Google Fonts at all — a real improvement on the round-1
// Artifact wireframe's <link> tag. Same TTFs already used to embed FHI
// branding into the docx supplier profiles (fhi-profile-formatting skill),
// so this is the established brand asset, not a new one.
const geist = localFont({
  src: [
    { path: "./fonts/Geist-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Geist-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Geist-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/Geist-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-geist",
  display: "swap",
});
const manrope = localFont({
  src: [
    { path: "./fonts/Manrope-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Manrope-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Manrope-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/Manrope-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Market Intelligence Console — Dashboard",
  description:
    "Live EPR/EHR market-share, country comparison and search dashboard for the European Health IT Market Intelligence Database.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${geist.variable} ${manrope.variable}`}>
      {children}
    </div>
  );
}
