import "./globals.css";
import "./custom-studio.css";
import ShopShell from "./components/shop-shell";

export const metadata = {
  title: "ATELIER IX | Haute Streetwear",
  description: "Considered T-shirts for your everyday. Explore modern silhouettes, find your color, and make it your own at ATELIER IX.",
};

export default function RootLayout({ children }) {
  return <html lang="en"><body><ShopShell>{children}</ShopShell></body></html>;
}
