import "./globals.css";
import "./rippy-hero-fix.css";
import "./theme.css";
import RippyAssistant from "../components/RippyAssistant";
import RippyHero from "../components/RippyHero";
import RippyScrollStory from "../components/RippyScrollStory";
import LaserCursor from "../components/LaserCursor";
import AccountOnboardingGate from "../components/AccountOnboardingGate";
import AnalysisGate from "../components/AnalysisGate";
import StrategyMount from "../components/StrategyMount";
import IdeasMount from "../components/IdeasMount";
import CreatorMount from "../components/CreatorMount";
import CalendarMount from "../components/CalendarMount";
import LandingMarketingMount from "../components/LandingMarketingMount";
import StudioNavigationMount from "../components/StudioNavigationMount";
import ThemeToggle from "../components/ThemeToggle";

export const metadata = {
  title: "RP Social — by RP Digital",
  description: "Il tuo Social Media Manager digitale"
};

export default function RootLayout({ children }) {
  return (
    <html lang="it" data-theme="dark">
      <body>{children}<RippyHero/><RippyScrollStory/><RippyAssistant/><LandingMarketingMount/><AccountOnboardingGate/><AnalysisGate/><StrategyMount/><IdeasMount/><CreatorMount/><CalendarMount/><StudioNavigationMount/><ThemeToggle/><LaserCursor/></body>
    </html>
  );
}
