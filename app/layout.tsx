import type { Metadata } from "next";
import { Space_Grotesk, Outfit } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PropertyLedge | Your entire property portfolio. Automated in one place.",
  description:
    "PropertyLedge is the operating platform for Australian landlords, property managers and agencies. Manage properties, rent, leases, inspections and financial reporting in one intelligent workspace.",
  keywords: [
    "Australian property management",
    "landlord software",
    "automated rent collection",
    "digital leasing",
    "ATO property reports",
    "property inspections",
  ],
  authors: [{ name: "PropertyLedge" }],
  icons: {
    icon: [
      { url: "/logo_Light.png", media: "(prefers-color-scheme: light)" },
      { url: "/logo_Dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    shortcut: "/logo_Dark.png",
    apple: "/logo_Dark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth dark" data-theme-mode="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const storedTheme = localStorage.getItem('propertyledge_theme') || 'dark';
                document.documentElement.setAttribute('data-theme-mode', storedTheme);
                if (storedTheme === 'dark' || storedTheme === 'full-dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${outfit.variable} font-sans min-h-screen antialiased selection:bg-accent selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
