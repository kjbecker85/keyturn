import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Display face for the big numbers.
const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Keyturn", template: "%s · Keyturn" },
  description: "Transition command center for property takeovers.",
  appleWebApp: { capable: true, title: "Keyturn", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1320" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Display preferences live in cookies so the first paint is already right.
  const store = await cookies();
  const theme = store.get("kt-theme")?.value === "dark" ? "dark" : "light";
  const density = store.get("kt-density")?.value === "compact" ? "compact" : "comfortable";

  return (
    <html
      lang="en"
      data-theme={theme}
      data-density={density}
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
