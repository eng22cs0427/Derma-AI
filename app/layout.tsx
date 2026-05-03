import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MedicalHistoryProvider } from "@/contexts/MedicalHistoryContext";
import { WishlistProvider } from "@/components/shop/wishlist-context";
import { CartProvider } from "@/contexts/cart-context";
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Carcino AI",
  description: "AI-powered dermatology analysis and medical management",
};

import { ToastListener } from "@/components/toast-listener";
import { Suspense } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className} suppressHydrationWarning>
          <MedicalHistoryProvider>
            <WishlistProvider>
              <CartProvider>
                <Suspense fallback={null}>
                  <ToastListener />
                </Suspense>
                {children}
                <Toaster />
              </CartProvider>
            </WishlistProvider>
          </MedicalHistoryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
