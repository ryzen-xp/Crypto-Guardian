'use client'

import { useState } from 'react'

interface LandingPageClientProps {
  children: React.ReactNode
}

export default function LandingPageClient({ children }: LandingPageClientProps) {
  const [isHydrated, setIsHydrated] = useState(true)

  // Just render children without any redirect logic
  return <>{children}</>
}
