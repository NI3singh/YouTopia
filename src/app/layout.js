import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LoadingProvider } from '@/context/LoadingContext';
import GlobalLoader from '@/components/GlobalLoader';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Youtopia", // Updated title
  description: "Your personal YouTube learning library.", // Updated description
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/*
          The provider wraps your entire application (children),
          giving every page access to the loading context.
        */}
        <LoadingProvider>
          {children}
          {/*
            The GlobalLoader is also inside the provider, so it
            knows when to show or hide itself.
          */}
          <GlobalLoader />
        </LoadingProvider>
      </body>
    </html>
  );
}