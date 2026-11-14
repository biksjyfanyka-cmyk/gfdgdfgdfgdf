import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "BaldiCraft — кооп и мультиплеер",
  description: "Кооперативная воксельная игра про Балди: собирайте тетради вместе.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
