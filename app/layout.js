import "./globals.css";
import "./rippy-hero-fix.css";
import "./theme.css";
import "./kairo-assets.css";
import "./usability.css";
import KairoExperience from "../components/KairoExperience";
import AccountOnboardingGate from "../components/AccountOnboardingGate";
import AnalysisGate from "../components/AnalysisGate";
import StrategyMount from "../components/StrategyMount";
import IdeasMount from "../components/IdeasMount";
import CreatorMount from "../components/CreatorMount";
import CalendarMount from "../components/CalendarMount";
import DashboardMount from "../components/DashboardMount";
import LibraryMount from "../components/LibraryMount";
import SocialConnectionsMount from "../components/SocialConnectionsMount";
import SettingsMount from "../components/SettingsMount";
import LandingMarketingMount from "../components/LandingMarketingMount";
import StudioNavigationMount from "../components/StudioNavigationMount";
import ThemeToggle from "../components/ThemeToggle";

export const metadata = {
  title: "KAIRO — Il contenuto giusto, al momento giusto",
  description: "KAIRO analizza, pianifica e crea i tuoi contenuti social con l'intelligenza artificiale. Creati dall'AI, approvati da te."
};

export default function RootLayout({ children }) {
  return (
    <html lang="it" data-theme="light">
      <body>
        {children}
        <KairoExperience/>
        <LandingMarketingMount/>
        <AccountOnboardingGate/>
        <AnalysisGate/>
        <StrategyMount/>
        <IdeasMount/>
        <CreatorMount/>
        <CalendarMount/>
        <DashboardMount/>
        <LibraryMount/>
        <SocialConnectionsMount/>
        <SettingsMount/>
        <StudioNavigationMount/>
        <ThemeToggle/>
      </body>
    </html>
  );
}
