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
        <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
            {/* 🟢 Убрали bg-slate-900 и text-slate-100. Заменили на bg-theme-main и text-theme-text */}
            <body className="h-dvh w-screen flex flex-col bg-theme-main text-theme-text select-none [-webkit-touch-callout:none] overflow-hidden transition-colors duration-500">
                <I18nProvider>
                    <AlertProvider>
                        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
                            {/* 🟢 Убрали mix-blend-screen, так как на светлом фоне он делает цвета невидимыми. Оставили просто прозрачность */}
                            <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-blue-500/10 rounded-full blur-[100px]"></div>
                            <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-rose-500/10 rounded-full blur-[100px]"></div>
                        </div>
                        
                        {children}
                        
                    </AlertProvider>
                </I18nProvider>
            </body>
        </html>
    );
}