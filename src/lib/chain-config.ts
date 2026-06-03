/**
 * Chain configuration — reads from env vars so switching
 * between testnet (Base Sepolia) and mainnet (Base) is just an env change.
 */

export const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true'
export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '84532', 10)

export const CHAIN_CONFIG = IS_TESTNET
  ? {
      id: 84532,
      name: 'Base Sepolia',
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? 'https://sepolia.base.org',
      explorerUrl: 'https://sepolia.basescan.org',
      explorerName: 'Sepolia Basescan',
      isTestnet: true,
      faucetUrl: 'https://www.alchemy.com/faucets/base-sepolia',
    }
  : {
      id: 8453,
      name: 'Base',
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? 'https://mainnet.base.org',
      explorerUrl: 'https://basescan.org',
      explorerName: 'Basescan',
      isTestnet: false,
      faucetUrl: null,
    }

/** Returns the tx URL for the current chain */
export function getTxUrl(txHash: string): string {
  return `${CHAIN_CONFIG.explorerUrl}/tx/${txHash}`
}

/** Returns a token URL for the current chain */
export function getTokenUrl(address: string): string {
  return `${CHAIN_CONFIG.explorerUrl}/token/${address}`
}
