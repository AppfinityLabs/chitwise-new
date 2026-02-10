import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SWRProvider } from "@/context/SWRProvider";
import LayoutClient from "./LayoutClient";

export const metadata: Metadata = {
    title: "ChitWise",
    description: "Advanced Chit Fund Management",
};

export const viewport: Viewport = {
    themeColor: '#09090b',
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
        <html lang="en">
            <body className="bg-zinc-950 text-zinc-50 min-h-screen flex antialiased selection:bg-indigo-500/30" suppressHydrationWarning={true}>
                <SWRProvider>
                    <AuthProvider>
                        <LayoutClient>
                            {children}
                        </LayoutClient>
                    </AuthProvider>
                </SWRProvider>
            </body>
        </html>
    );
}
