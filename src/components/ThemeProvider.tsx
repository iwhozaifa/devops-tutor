"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// `nonce` lets next-themes' inline anti-flicker script pass the CSP
export function ThemeProvider({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return (
    <NextThemesProvider
      nonce={nonce}
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
