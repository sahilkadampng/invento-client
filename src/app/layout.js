import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/QueryProvider";
import SocketProvider from "@/providers/SocketProvider";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "Invento — Warehouse Inventory Management",
  description: "Production-grade Warehouse Inventory Management System for modern businesses. Track products, manage stock, handle invoices, and analyze performance.",
  keywords: "inventory, warehouse, management, stock, barcode, invoicing",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} font-sans antialiased`}>
        <QueryProvider>
          <SocketProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                },
              }}
            />
          </SocketProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
