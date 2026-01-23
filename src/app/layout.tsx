import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

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
            <body className="bg-background text-foreground min-h-screen flex antialiased selection:bg-indigo-500/30">
                <Sidebar />
                <main className="flex-1 h-screen overflow-y-auto w-full">
                    <div className="max-w-7xl mx-auto p-8">
                        {children}
                    </div>
                </main>
            </body>
        </html>
    );
}
