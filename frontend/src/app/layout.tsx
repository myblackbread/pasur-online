import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AlertProvider } from "@/components/providers/AlertProvider";
import { I18nProvider } from "@/components/providers/I18nProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Pasur",
    description: "Premium online card game",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
            <body className="min-h-full flex flex-col bg-slate-900 text-slate-100 selection:bg-amber-400/30 overflow-x-hidden">
                <I18nProvider>
                    <AlertProvider>
                        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
                            <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-900/20 rounded-full mix-blend-screen blur-[120px]"></div>
                            <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-rose-900/10 rounded-full mix-blend-screen blur-[120px]"></div>
                        </div>
                        
                        {children}
                        
                    </AlertProvider>
                </I18nProvider>
            </body>
        </html>
    );
}