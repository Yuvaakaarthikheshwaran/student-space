import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cosmic Drift | Relativistic Engine',
  description: 'Classified 2D Physics Engine',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* NUCLEAR OPTION: Force Tailwind to load directly in the browser, bypassing Vercel's broken compiler */}
        <script src="https://cdn.tailwindcss.com"></script>
        
        {/* Inject custom scrollbars and base dark mode directly to guarantee they load */}
        <style>{`
          body {
            background-color: #010101 !important;
            color: #ffffff !important;
            margin: 0;
            overflow: hidden;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(34, 211, 238, 0.5);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(34, 211, 238, 0.8);
          }
        `}</style>
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
