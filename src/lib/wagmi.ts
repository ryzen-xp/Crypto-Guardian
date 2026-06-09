import { createConfig, http } from 'wagmi'
import { sepolia, mainnet } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true'
export const WAGMI_CHAIN = IS_TESTNET ? sepolia : mainnet

const projectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_ID &&
  process.env.NEXT_PUBLIC_WALLET_CONNECT_ID.length > 8
    ? process.env.NEXT_PUBLIC_WALLET_CONNECT_ID
    : '00000000000000000000000000000001'

export const wagmiConfig = createConfig({
  chains: [sepolia, mainnet],
  connectors: [
    injected(),
    walletConnect({ projectId }),
    coinbaseWallet({ appName: 'CryptoGuardian' }),
  ],
  transports: {
    [sepolia.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com'
    ),
    [mainnet.id]: http(),
  },
  ssr: true,
})
