"use client";

import { usePathname } from "next/navigation";

import Footer from "../Footer";
import Header from "../Header";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/register" || pathname === "/login";

  return (
    <>
      {!isAuthPage && <Header />}
      {children}
      {!isAuthPage && <Footer />}
    </>
  );
}
