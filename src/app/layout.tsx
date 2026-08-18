import type { Metadata } from "next";
import { Inter, Poppins, Open_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
  variable: "--font-poppins",
});
export const metadata: Metadata = {
  title: "Shane Cranor",
  description:
    "Building cool stuff. Software, electronics, photography, music, and more",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${poppins.variable} ${openSans.variable}`}
    >
      <body className={inter.className}>{children}</body>
    </html>
  );
}
