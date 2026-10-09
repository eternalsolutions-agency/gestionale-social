import "./globals.css";
import "./rippy-hero-fix.css";
import RippyAssistant from "../components/RippyAssistant";
import RippyHero from "../components/RippyHero";
import LaserCursor from "../components/LaserCursor";

export const metadata = {
  title: "RP Social — by RP Digital",
  description: "Il tuo Social Media Manager digitale"
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}<RippyHero/><RippyAssistant/><LaserCursor/></body>
    </html>
  );
}