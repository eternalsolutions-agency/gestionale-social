import "./globals.css";
import "./rippy-hero-fix.css";
import "./theme.css";
import "./kairo-assets.css";
import "./usability.css";
import "./effects.css";
import "./ideas-polish.css";
import KairoExperience from "../components/KairoExperience";
import AccountOnboardingGate from "../components/AccountOnboardingGate";
import LandingMarketingMount from "../components/LandingMarketingMount";
import WorkspaceNavigation from "../components/WorkspaceNavigation";
import VisualEffects from "../components/VisualEffects";
import ThemeToggle from "../components/ThemeToggle";

export const metadata = {
  title: "KAIRO — Il contenuto giusto, al momento giusto",
  description: "KAIRO analizza, pianifica e crea i tuoi contenuti social con l'intelligenza artificiale. Creati dall'AI, approvati da te."
};

export default function RootLayout({ children }) {
  return (
    <html lang="it" data-theme="light">
      <body>
        <a className="skipLink" href="#main-content">Vai al contenuto</a>
        <WorkspaceNavigation/>
        <div id="main-content" tabIndex={-1}>{children}</div>
        <KairoExperience/>
        <LandingMarketingMount/>
        <AccountOnboardingGate/>
        <VisualEffects/>
        <ThemeToggle/>
      </body>
    </html>
  );
}
