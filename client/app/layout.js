import './globals.css'
import Script from 'next/script'

export const metadata = {
  title: 'Strudel Live Coding',
  description: 'Edit patterns below. Visit strudel.cc for docs.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='.9em' font-size='28'>🌀</text></svg>",
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="importmap"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              imports: {
                '@strudel/core': 'https://unpkg.com/@strudel/core@1.2.6/dist/index.mjs',
                'fraction.js': 'https://unpkg.com/fraction.js@5.2.1/dist/fraction.mjs',
                '@kabelsalat/web': 'https://unpkg.com/@kabelsalat/web@0.4.1/dist/index.mjs',
                '@kabelsalat/core': 'https://unpkg.com/@kabelsalat/core@0.4.0/dist/index.mjs',
                '@kabelsalat/lib': 'https://unpkg.com/@kabelsalat/lib@0.4.1/dist/index.mjs',
              },
            }),
          }}
        />
      </head>
      <body>
        <Script src="https://unpkg.com/@strudel/repl@latest" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  )
}
