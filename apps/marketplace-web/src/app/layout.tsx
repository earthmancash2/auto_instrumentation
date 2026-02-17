import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Marketplace - Buy & Sell Unique Items',
  description: 'A realistic marketplace application for auto-instrumentation testing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Fake 3P scripts (loaded in both layouts - inconsistent) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              console.log('[Analytics Script] Loading...');
              window.analytics = window.analytics || [];
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex justify-between items-center">
              <a href="/" className="text-2xl font-bold">Marketplace</a>
              <div className="flex gap-4">
                <a href="/products" className="hover:underline">Products</a>
                <a href="/search" className="hover:underline">Search</a>
                <a href="/cart" className="hover:underline">Cart</a>
                <a href="/dashboard" className="hover:underline">Dashboard</a>
              </div>
            </nav>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">{children}</main>
        <footer className="border-t mt-16">
          <div className="container mx-auto px-4 py-8 text-center text-gray-600">
            <p>&copy; 2024 Marketplace. Built for auto-instrumentation testing.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
