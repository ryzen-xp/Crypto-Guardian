/**
 * Chain configuration — testnet = Ethereum Sepolia, mainnet = Ethereum mainnet.
 * Switch by changing NEXT_PUBLIC_IS_TESTNET in .env.local.
 */

export const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true'
export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '11155111', 10)

export const CHAIN_CONFIG = IS_TESTNET
  ? {
      id: 11155111,
      name: 'Ethereum Sepolia',
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com',
      explorerUrl: 'https://sepolia.etherscan.io',
      explorerName: 'Sepolia Etherscan',
      isTestnet: true,
      faucetUrl: 'https://sepoliafaucet.com',
    }
  : {
      id: 1,
      name: 'Ethereum',
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? 'https://eth.llamarpc.com',
      explorerUrl: 'https://etherscan.io',
      explorerName: 'Etherscan',
      isTestnet: false,
      faucetUrl: null,
    }

export function getTxUrl(txHash: string): string {
  return `${CHAIN_CONFIG.explorerUrl}/tx/${txHash}`
}

export function getTokenUrl(address: string): string {
  return `${CHAIN_CONFIG.explorerUrl}/token/${address}`
}

export const ACTIVE_CHAIN = {
  id: CHAIN_CONFIG.id,
  name: CHAIN_CONFIG.name,
} as const
