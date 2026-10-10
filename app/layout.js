import "./globals.css";
import "./rippy-hero-fix.css";
import RippyAssistant from "../components/RippyAssistant";
import RippyHero from "../components/RippyHero";
import LaserCursor from "../components/LaserCursor";
import AccountOnboardingGate from "../components/AccountOnboardingGate";
import AnalysisGate from "../components/AnalysisGate";
import StrategyMount from "../components/StrategyMount";
import IdeasMount from "../components/IdeasMount";
import CreatorMount from "../components/CreatorMount";
import CalendarMount from "../components/CalendarMount";
import LandingMarketingMount from "../components/LandingMarketingMount";

export const metadata = {
  title: "RP Social — by RP Digital",
  description: "Il tuo Social Media Manager digitale"
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}<RippyHero/><RippyAssistant/><LandingMarketingMount/><AccountOnboardingGate/><AnalysisGate/><StrategyMount/><IdeasMount/><CreatorMount/><CalendarMount/><LaserCursor/></body>
    </html>
  );
}
