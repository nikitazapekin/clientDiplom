"use client";

import { usePathname } from "next/navigation";

import Footer from "../Footer";
import Header from "../Header";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/register" || pathname === "/login" || pathname === "/auth";

  return (
    <>
      {!isAuthPage && <Header />}
      {children}
      {!isAuthPage && <Footer />}
    </>
  );
}
