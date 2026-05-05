import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MedicalHistoryProvider } from "@/contexts/MedicalHistoryContext";
import { WishlistProvider } from "@/components/shop/wishlist-context";
import { CartProvider } from "@/contexts/cart-context";
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from "sonner";
import { PageLoader } from "@/components/ui/page-loader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Derma AI – AI Powered Skin Disease Analysis",
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
                  <PageLoader />
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
