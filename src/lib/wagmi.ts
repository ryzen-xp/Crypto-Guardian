import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia, mainnet } from 'wagmi/chains'

const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true'

const projectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_ID &&
  process.env.NEXT_PUBLIC_WALLET_CONNECT_ID.length > 8
    ? process.env.NEXT_PUBLIC_WALLET_CONNECT_ID
    : '00000000000000000000000000000001'

export const wagmiConfig = getDefaultConfig({
  appName: 'CryptoGuardian',
  projectId,
  chains: IS_TESTNET ? [sepolia] : [mainnet],
  ssr: true,
})

export const WAGMI_CHAIN = IS_TESTNET ? sepolia : mainnet
