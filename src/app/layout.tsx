import type { Metadata } from "next";
import { Cairo, Quicksand } from "next/font/google";
import "./globals.css";
import Providers from "@/app/providers";
import WhatsAppFloat from "@/components/WhatsAppFloat";

const quicksand = Quicksand({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-quicksand",
  display: "swap",
});

const cairo = Cairo({
  weight: "400",
  subsets: ["latin", "arabic"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "بت ستور | Pet Store",
  description: "Pet Store Kuwait — شريكك الموثوق في عالم الحيوانات الأليفة",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${quicksand.variable} ${cairo.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
        <WhatsAppFloat />
      </body>
    </html>
  );
}
