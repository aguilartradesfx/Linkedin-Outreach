'use client'

import { useRouter } from 'next/navigation'

interface Props {
  href: string
  children: React.ReactNode
}

export function ClickableRow({ href, children }: Props) {
  const router = useRouter()
  return (
    <tr
      onClick={() => router.push(href)}
      className="hover:bg-white/[0.03] transition-colors cursor-pointer"
    >
      {children}
    </tr>
  )
}
