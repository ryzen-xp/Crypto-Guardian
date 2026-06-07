/**
 * On-chain balance fetching for the monitored coins.
 *
 * Uses the public Base RPC — no API key required.
 * Returns balances in USD value using CoinGecko prices.
 *
 * A coin is considered "held" if:
 *   - ETH/WETH: native balance > 0.001 ETH
 *   - ERC20: token balance > minimum threshold (dust filter)
 */

import { createPublicClient, http, formatUnits } from 'viem'
import { baseSepolia, base } from 'wagmi/chains'
import { MONITORED_COINS } from './coins'
import { IS_TESTNET } from './chain-config'

// Minimal ERC20 ABI — only balanceOf needed
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// Dust thresholds — below this we consider the wallet as NOT holding the asset
const DUST_THRESHOLDS: Record<string, number> = {
  ETH: 0.001, // 0.001 ETH
  WBTC: 0.00001, // ~$0.60 at $60k
  ARB: 1.0, // 1 ARB
  OP: 1.0, // 1 OP
}

export type WalletBalance = {
  symbol: string
  rawBalance: bigint
  decimals: number
  formatted: number // human-readable amount
  isHeld: boolean // true if above dust threshold
}

export type WalletBalances = Record<string, WalletBalance>

/**
 * Fetch on-chain balances for all monitored coins for a given wallet address.
 * Called from the API route — server-side only.
 */
export async function fetchWalletBalances(walletAddress: string): Promise<WalletBalances> {
  const chain = IS_TESTNET ? baseSepolia : base
  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL ??
    (IS_TESTNET ? 'https://sepolia.base.org' : 'https://mainnet.base.org')

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
  })

  const results: WalletBalances = {}

  // Fetch all balances in parallel
  await Promise.all(
    Object.values(MONITORED_COINS).map(async (coin) => {
      try {
        let rawBalance: bigint

        if (coin.symbol === 'ETH') {
          // Native ETH balance
          rawBalance = await client.getBalance({
            address: walletAddress as `0x${string}`,
          })
        } else {
          // ERC20 balance
          rawBalance = (await client.readContract({
            address: coin.baseAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          })) as bigint
        }

        const formatted = parseFloat(formatUnits(rawBalance, coin.decimals))
        const dustThreshold = DUST_THRESHOLDS[coin.symbol] ?? 0.01
        const isHeld = formatted > dustThreshold

        results[coin.symbol] = {
          symbol: coin.symbol,
          rawBalance,
          decimals: coin.decimals,
          formatted,
          isHeld,
        }
      } catch {
        // If balance check fails (wrong network, contract not deployed on testnet, etc.)
        // mark as not held rather than crashing
        results[coin.symbol] = {
          symbol: coin.symbol,
          rawBalance: BigInt(0),
          decimals: coin.decimals,
          formatted: 0,
          isHeld: false,
        }
      }
    })
  )

  return results
}

/**
 * Filter to only coins that the wallet actually holds above dust threshold.
 */
export function getHeldCoins(balances: WalletBalances): string[] {
  return Object.values(balances)
    .filter((b) => b.isHeld)
    .map((b) => b.symbol)
}
