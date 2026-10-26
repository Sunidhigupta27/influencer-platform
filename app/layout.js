import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";
import { APP_NAME, TAGLINE } from "@/lib/config";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body-face",
  display: "swap",
});

export const metadata = {
  title: `${APP_NAME} | ${TAGLINE}`,
  description:
    "Creators link Instagram, Facebook and YouTube and see ads and videos that fit their follower count.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
