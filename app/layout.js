import "./globals.css";
import RippyAssistant from "../components/RippyAssistant";

export const metadata = {
  title: "RP Social — by RP Digital",
  description: "Il tuo Social Media Manager digitale"
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}<RippyAssistant/></body>
    </html>
  );
}