import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import AutoLogout from "@/components/AutoLogout";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: 'בטיחות ומפעלים | נוער חב"ד',
  description: 'מערכת לניהול, תכנון ואישור טיולים ואירועים',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#00BCD4',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${rubik.variable} bg-[#F8F9FA] text-[#263238] font-sans antialiased`}>
        {/* רכיב הניתוק האוטומטי */}
        <AutoLogout />
        
        <main className="min-h-screen flex flex-col">
           {children}
        </main>
      </body>
    </html>
  );
}