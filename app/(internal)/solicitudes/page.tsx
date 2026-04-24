import { Suspense } from 'react'
import { SolicitudesDashboard } from '@/components/proposals/solicitudes-dashboard'

export const metadata = { title: 'Solicitudes de propuesta' }

export default function SolicitudesPage() {
  return (
    <Suspense>
      <SolicitudesDashboard />
    </Suspense>
  )
}
