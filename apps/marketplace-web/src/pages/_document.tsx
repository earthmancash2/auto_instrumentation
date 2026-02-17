/**
 * Legacy Document Component
 * Loads fake 3P scripts (Intercom, Analytics)
 */

import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Fake Intercom script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                console.log('[Intercom Script] Loading from _document.tsx');
                window.Intercom = window.Intercom || function() {
                  console.log('[Intercom]', arguments);
                };
              })();
            `,
          }}
        />
        {/* Fake Analytics script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                console.log('[Analytics Script] Loading from _document.tsx');
                window.ga = window.ga || function() {
                  console.log('[GA]', arguments);
                };
              })();
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
