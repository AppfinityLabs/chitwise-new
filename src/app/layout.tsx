import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/context/AuthContext";
import LayoutClient from "./LayoutClient";

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "ChitWise",
    description: "Advanced Chit Fund Management",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="bg-background text-foreground min-h-screen flex antialiased selection:bg-indigo-500/30" suppressHydrationWarning={true}>
                <AuthProvider>
                    <LayoutClient>
                        {children}
                    </LayoutClient>
                </AuthProvider>
            </body>
        </html>
    );
}
