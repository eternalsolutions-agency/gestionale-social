import "./globals.css";

export const metadata = {
  title: "Gestionale Social",
  description: "Dashboard social media con AI"
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}