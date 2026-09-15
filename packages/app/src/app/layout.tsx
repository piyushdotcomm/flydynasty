import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Real Fly Lab — the real fruit fly brain",
  description:
    "An interactive lab running a published model of the real fruit fly brain: all 139,248 FlyWire neurons at their real positions, the Shiu et al. 2024 leaky integrate-and-fire model, and precomputed taste-stimulus experiments you can inspect — including the paper checks.",
  icons: {
    icon: [
      {
        url: "/fly.svg",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#0a0a0d] font-sans text-neutral-100">
        {children}
      </body>
    </html>
  );
}
