import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

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

// הגדרות תצוגה למובייל (PWA) בנפרד - לפי התקן החדש
export const viewport: Viewport = {
  themeColor: '#00BCD4',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // מונע זום אוטומטי מעצבן בשדות קלט בטלפון
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
        <main className="min-h-screen flex flex-col">
           {children}
        </main>
      </body>
    </html>
  );
}