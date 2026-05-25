import type { Metadata } from "next";
import { Suspense } from "react";

import { Navbar } from "@/components/layout/Navbar";
import { CourseUiProvider } from "@/providers/CourseUiProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "CS201 Course Portal",
  description: "CS201 course materials, deadlines, homework, and project tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className="h-full antialiased"
    >
      <body className="min-h-full">
        <Suspense fallback={<div className="min-h-full" />}>
          <CourseUiProvider>
            <div className="app-shell">
              <div className="w-full">
                <Navbar />
                <main className="page-container">{children}</main>
              </div>
            </div>
          </CourseUiProvider>
        </Suspense>
      </body>
    </html>
  );
}
