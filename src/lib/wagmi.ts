import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { baseSepolia, base } from 'wagmi/chains'

const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true'

// WalletConnect projectId — required for WalletConnect modal.
// MetaMask injected connector works without it.
// Get a free key at https://cloud.walletconnect.com
//
// We use a known valid-format placeholder so RainbowKit doesn't throw
// during SSR / build. The WalletConnect option simply won't work without a real key.
const projectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_ID && process.env.NEXT_PUBLIC_WALLET_CONNECT_ID.length > 8
    ? process.env.NEXT_PUBLIC_WALLET_CONNECT_ID
    : '00000000000000000000000000000001' // 32-char hex placeholder

export const wagmiConfig = getDefaultConfig({
  appName: 'CryptoGuardian',
  projectId,
  chains: IS_TESTNET ? [baseSepolia] : [base],
  ssr: true,
})

export const WAGMI_CHAIN = IS_TESTNET ? baseSepolia : base
