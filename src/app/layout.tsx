import styles from "@styles/wrappers.module.scss";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import LayoutWrapper from "./components/LayoutWrapper";

import "./styles/global.scss";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Next.js 14 with Styled Components",
  description: "Example of Next.js App Router with Styled Components",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className={`  ${styles.layout}`}>
        <LayoutWrapper>
          <main className={styles.main}>{children}</main>
        </LayoutWrapper>
      </body>
    </html>
  );
}
