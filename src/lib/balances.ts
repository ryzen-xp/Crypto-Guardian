/**
 * On-chain balance fetching for the monitored coins.
 *
 * Uses the configured RPC — no API key required.
 * Returns balances in human-readable units.
 *
 * A coin is considered "held" if:
 *   - ETH: native balance > 0.0001 ETH  (very low threshold — any Sepolia faucet amount qualifies)
 *   - ERC20: token balance > dust threshold
 *
 * On testnet, ERC20 contracts may not be deployed or may fail —
 * those coins are silently marked as not held (isHeld: false).
 */

import { createPublicClient, http, formatUnits } from 'viem'
import { sepolia, mainnet } from 'wagmi/chains'
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
// Testnet thresholds are very low — faucet drips are tiny
// Minimum monitoring: $0.005 USD equivalent per asset
const DUST_THRESHOLDS: Record<string, number> = IS_TESTNET
  ? {
      WETH: 0.000001,  // extremely low for testnet (all amounts count until $0.005 USD check)
    }
  : {
      WETH: 0.001,
    }

// Minimum USD value to monitor an asset (defaults to $0.005)
export const MINIMUM_MONITOR_USD = 0.005

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
 * 
 * A coin is considered "held" if:
 *   1. Balance is above dust threshold (tokenomics check)
 *   2. Balance is worth at least $0.005 USD (monitoring threshold)
 */
export async function fetchWalletBalances(
  walletAddress: string,
  priceMap?: Record<string, number | { usd: number }>
): Promise<WalletBalances> {
  const chain = IS_TESTNET ? sepolia : mainnet
  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL ??
    (IS_TESTNET ? 'https://ethereum-sepolia-rpc.publicnode.com' : 'https://eth.llamarpc.com')

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
          // Native ETH balance — always works on any EVM chain
          rawBalance = await client.getBalance({
            address: walletAddress as `0x${string}`,
          })
        } else {
          // ERC20 balance — may fail on testnet if contract not deployed
          rawBalance = (await client.readContract({
            address: coin.baseAddress.toLowerCase() as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [walletAddress as `0x${string}`],
          })) as bigint
        }

        const formatted = parseFloat(formatUnits(rawBalance, coin.decimals))
        const dustThreshold = DUST_THRESHOLDS[coin.symbol] ?? 0.001
        const priceData = priceMap?.[coin.symbol]
        const coinPrice = typeof priceData === 'number' ? priceData : (priceData as any)?.usd ?? 0
        const balanceUSD = formatted * coinPrice
        // Held if: above dust threshold AND worth at least $0.005
        const isHeld = formatted > dustThreshold && balanceUSD >= MINIMUM_MONITOR_USD

        results[coin.symbol] = {
          symbol: coin.symbol,
          rawBalance,
          decimals: coin.decimals,
          formatted,
          isHeld,
        }
      } catch (err) {
        console.warn(
          `[fetchWalletBalances] Fetching ${coin.symbol} balance failed (likely not deployed on this network): ${err instanceof Error ? err.message : String(err)}`
        )
        // If balance check fails (contract not deployed on testnet, etc.)
        // mark as not held rather than crashing — this is expected on Sepolia
        // for WBTC/LINK/UNI — rare testnet deployment issues are handled gracefully
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
