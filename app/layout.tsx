import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css"; // <--- חייב להיות כאן!

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: 'בטיחות ומפעלים | נוער חב"ד',
  description: 'מערכת לניהול, תכנון ואישור טיולים ואירועים',
  manifest: '/manifest.json', // הוספנו את זה
  icons: {
    icon: '/icon.png',        // הוספנו את זה
    apple: '/icon.png',       // אייקון לאייפון
  },
  themeColor: '#00BCD4',      // צבע הדפדפן במובייל
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