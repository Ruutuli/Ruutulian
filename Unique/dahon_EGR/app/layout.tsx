import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Dahon Abre | The Verdant Remedy", description: "Character profile for Dahon Abre, botanical mage and adviser of Evermere Grand Bazaar." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
