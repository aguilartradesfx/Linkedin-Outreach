import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bralto Admin',
  description: 'Panel interno de Bralto',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
