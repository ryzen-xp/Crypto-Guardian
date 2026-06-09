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
const DUST_THRESHOLDS: Record<string, number> = IS_TESTNET
  ? {
      ETH: 0.0001,   // any Sepolia faucet drip (0.05–0.5 ETH) qualifies
      WBTC: 0.000001, // Aave testnet WBTC (8 decimals) — very small amounts count
      LINK: 0.01,    // Chainlink faucet gives 10–20 LINK per request
      UNI: 0.01,     // Uniswap faucet / transfers
    }
  : {
      ETH: 0.001,
      WBTC: 0.00001,
      LINK: 1.0,
      UNI: 1.0,
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
        const isHeld = formatted > dustThreshold

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
