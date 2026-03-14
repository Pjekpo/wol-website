import "./globals.css";

export const metadata = {
  title: "The WOL Collective",
  description: "Afro-centred clothing brand storefront with Stripe checkout.",
  icons: {
    icon: "/favicon.ico?v=2",
    shortcut: "/favicon.ico?v=2"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
