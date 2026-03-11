import "./globals.css";

export const metadata = {
  title: "The WOL Collective",
  description: "Afro-centred clothing brand storefront with Stripe checkout.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
