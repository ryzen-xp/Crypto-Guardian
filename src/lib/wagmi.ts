import { createConfig, http } from 'wagmi'
import { sepolia, mainnet } from 'wagmi/chains'
import { injected, metaMask, safe, walletConnect } from 'wagmi/connectors'
import { getDefaultConfig } from 'connectkit'

const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true'
export const WAGMI_CHAIN = IS_TESTNET ? sepolia : mainnet

const projectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_ID &&
  process.env.NEXT_PUBLIC_WALLET_CONNECT_ID.length > 8
    ? process.env.NEXT_PUBLIC_WALLET_CONNECT_ID
    : '00000000000000000000000000000001'

export const wagmiConfig = createConfig(
  getDefaultConfig({
    chains: [sepolia, mainnet],
    transports: {
      [sepolia.id]: http(
        process.env.NEXT_PUBLIC_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com'
      ),
      [mainnet.id]: http(),
    },
    walletConnectProjectId: projectId,
    appName: 'CryptoGuardian',
    appDescription: 'AI-powered portfolio protection with smart accounts and Venice AI',
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    appIcon: process.env.NEXT_PUBLIC_APP_ICON ?? 'https://family.co/logo.png',
  })
)
