import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { AppStateProvider } from "@/components/providers/AppStateProvider";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "IRON LOG",
  description: "A mobile-first workout log for routines, sets, and progress.",
  applicationName: "IRON LOG",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IRON LOG",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0e0e11",
};

const themeScript = `(function(){try{var theme=localStorage.getItem("iron-log.theme")||"dark";if(!localStorage.getItem("iron-log.theme")){var raw=localStorage.getItem("forge.v1");if(raw){var data=JSON.parse(raw);if(data&&data.profile&&data.profile.theme)theme=data.profile.theme;}}var resolved=theme;if(theme==="system"){resolved=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.dataset.theme=resolved;document.documentElement.style.colorScheme=resolved;var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content",resolved==="light"?"#f5f5f6":"#0e0e11");}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" className={geist.variable} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <AppStateProvider>
          <AppShell>{children}</AppShell>
        </AppStateProvider>
      </body>
    </html>
  );
}
