'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { wagmiConfig } from '@/lib/wagmi'
import { useEffect } from 'react'

const queryClient = new QueryClient()

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Suppress analytics and telemetry fetch errors in dev
    const originalError = console.error
    console.error = (...args: any[]) => {
      const message = args[0]?.toString?.() || ''
      
      // Suppress known harmless errors
      if (
        message.includes('Analytics SDK') ||
        message.includes('Failed to fetch') ||
        message.includes('analytics') ||
        message.includes('telemetry')
      ) {
        return
      }
      
      originalError.apply(console, args)
    }
    
    return () => {
      console.error = originalError
    }
  }, [])

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
