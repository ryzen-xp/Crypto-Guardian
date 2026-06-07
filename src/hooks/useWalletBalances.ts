'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'

// Client-side balance type — rawBalance is a string (BigInt serialised over JSON)
export type ClientWalletBalance = {
  symbol: string
  rawBalance: string
  decimals: number
  formatted: number
  isHeld: boolean
}

export type ClientWalletBalances = Record<string, ClientWalletBalance>

type UseWalletBalancesResult = {
  balances: ClientWalletBalances | null
  heldCoins: string[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useWalletBalances(): UseWalletBalancesResult {
  const { address, isConnected } = useAccount()
  const [balances, setBalances] = useState<ClientWalletBalances | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBalances = useCallback(async () => {
    if (!address || !isConnected) {
      setBalances(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/wallet-balances?address=${address}`)
      const json = (await res.json()) as {
        success: boolean
        data?: { balances: ClientWalletBalances }
        error?: string
      }

      if (json.success && json.data) {
        setBalances(json.data.balances)
      } else {
        setError(json.error ?? 'Failed to fetch balances')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsLoading(false)
    }
  }, [address, isConnected])

  // Fetch on mount and when address changes
  useEffect(() => {
    void fetchBalances()
  }, [fetchBalances])

  // Derive held coins from balances (memoised to prevent infinite loops in useEffects)
  const heldCoins = useMemo(() => {
    if (!balances) return []
    return Object.values(balances)
      .filter((b) => b.isHeld)
      .map((b) => b.symbol)
  }, [balances])

  return { balances, heldCoins, isLoading, error, refetch: fetchBalances }
}
