import type { Metadata } from "next";
import { Rubik } from "next/font/google"; // שינוי ל-Rubik
import "./globals.css";

// הגדרת פונט Rubik
const rubik = Rubik({ 
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700", "900"], 
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: 'מערכת הטיולים | ארגון נוער חב"ד',
  description: 'מערכת לניהול, תכנון ואישור טיולים ואירועים',
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