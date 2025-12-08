import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CPC - Chat Product Company | WhatsApp Business Automation',
  description: 'Transform your business with AI-powered WhatsApp automation. Automated FAQ, booking, catalogue, and lead capture solutions for businesses.',
  keywords: 'WhatsApp automation, business automation, chatbot, AI, customer service, booking system, lead capture',
  authors: [{ name: 'CPC - Chat Product Company' }],
  openGraph: {
    title: 'CPC - WhatsApp Business Automation',
    description: 'Transform your business with AI-powered WhatsApp automation',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
