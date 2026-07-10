import { Cormorant_Garamond, Mukta } from "next/font/google";
import "./styles.css";
import "./globals.css";
import "./app.css";
import Topbar from "@/components/Topbar";
import ThemeBoot from "@/components/ThemeBoot";
import Footer from "@/components/Footer";
import { ToastProvider } from "@/components/Toast";

const mukta = Mukta({
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Āyus · Ayurveda Wellness Engine",
  description:
    "An evidence-tiered Ayurveda wellness engine — source-cited herbs, formulations, and daily routines.",
};

export const viewport = {
  themeColor: "#1f4d3a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${mukta.variable} ${cormorant.variable} antialiased`}>
        <ThemeBoot />
        <ToastProvider>
          <Topbar />
          {children}
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
