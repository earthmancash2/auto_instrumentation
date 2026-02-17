/**
 * Legacy Pages Router App Component
 * Coexists with App Router (realistic migration scenario)
 */

import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import '@/styles/legacy.css'; // Legacy styles

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex justify-between items-center">
            <a href="/" className="text-2xl font-bold">
              Marketplace
            </a>
            <div className="flex gap-4">
              <a href="/products" className="hover:underline">
                Products
              </a>
              <a href="/search" className="hover:underline">
                Search (Legacy)
              </a>
              <a href="/cart" className="hover:underline">
                Cart
              </a>
            </div>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Component {...pageProps} />
      </main>
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>&copy; 2024 Marketplace (Legacy Pages Router)</p>
        </div>
      </footer>
    </>
  );
}
