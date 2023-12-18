import authOptions from "@/app/api/auth/[...nextauth]/authOptions";
import "./globals.css";
import { getServerSession } from "next-auth";
import { Inter } from "next/font/google";
import AuthSessionProvider from "./components/AuthSessionProvider";
import { Header } from "./components/core/Header";
import { EmbedPlayer } from "./components/core/EmbedPlayer";
import { Providers } from "../lib/redux/providers";
import "bootstrap-icons/font/bootstrap-icons.css";
import { Toaster } from "@/components/ui/toaster";
import Footer from "./components/core/Footer";

const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <AuthSessionProvider session={session}>
        <body className={`${inter.className} h-full min-h-screen bg-gray-900`}>
          <Providers>
            <EmbedPlayer />
            <Toaster />
            <Header />
            {children}
            {session && <Footer />}
          </Providers>
        </body>
      </AuthSessionProvider>
    </html>
  );
}
