import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FHI Market Intelligence Console",
  description: "Coverage and data-quality console for the European Health IT Market Intelligence Database",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
