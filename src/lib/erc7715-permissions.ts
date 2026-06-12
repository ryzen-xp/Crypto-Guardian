/**
 * ERC-7715 Advanced Permissions for Crypto-Guardian.
 * 
 * Allows users to grant execution permissions directly from MetaMask
 * without sharing any private keys.
 * 
 * Based on DelegapayAgent's approach:
 * https://github.com/StarryDeserts/DelegapayAgent/tree/main/lib/metamask
 */

'use client'

import {
  createWalletClient,
  custom,
  formatUnits,
  getAddress,
  parseUnits,
  type Address,
  type EIP1193Provider,
} from 'viem'
import { sepolia } from 'viem/chains'
import { erc7715ProviderActions } from '@metamask/smart-accounts-kit/actions'
import { decodeDelegations } from '@metamask/smart-accounts-kit/utils'
import type { Delegation7710 } from './oneshot'

const SEPOLIA_CHAIN_ID = 11155111
const SEPOLIA_CHAIN_HEX = '0xaa36a7' as const
const USDC_DECIMALS = 6
const PERIOD_DURATION_SECONDS = 86_400
const DEFAULT_EXPIRY_SECONDS = 7 * 24 * 60 * 60 // 7 days

export const FEE_HEADROOM_USDC = '0.10'

export function budgetWithHeadroom(maxSpendUsdc: string): string {
  const atoms = parseUnits(maxSpendUsdc, USDC_DECIMALS) + parseUnits(FEE_HEADROOM_USDC, USDC_DECIMALS)
  return formatUnits(atoms, USDC_DECIMALS)
}

export interface WalletPermissionsClient {
  detect(): Promise<{ hasProvider: boolean; supported: boolean; chainId?: number }>
  connect(): Promise<{ address: Address; chainId: number }>
  grantPermission(args: {
    budgetUsdc: string
    targetAddress: Address
    usdcAddress: Address
    justification?: string
  }): Promise<{ delegations: Delegation7710[]; expiry: number }>
}

function getProvider(): EIP1193Provider | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { ethereum?: EIP1193Provider }).ethereum
}

function erc7715Client(provider: EIP1193Provider) {
  return createWalletClient({ chain: sepolia, transport: custom(provider) }).extend(
    erc7715ProviderActions()
  )
}

export function createWalletPermissionsClient(): WalletPermissionsClient {
  return {
    async detect() {
      const provider = getProvider()
      if (!provider) {
        return { hasProvider: false, supported: false }
      }

      let chainId: number | undefined
      try {
        const hex = (await provider.request({ method: 'eth_chainId' })) as `0x${string}`
        chainId = Number(hex)
      } catch {
        chainId = undefined
      }

      let supported = false
      try {
        const map = await erc7715Client(provider).getSupportedExecutionPermissions()
        // Check for erc20-token-allowance permission support
        supported = Boolean(map['erc20-token-allowance'])
      } catch (err) {
        console.warn('[ERC7715] Permission detection failed:', err)
        supported = false
      }

      return { hasProvider: true, supported, chainId }
    },

    async connect() {
      const provider = getProvider()
      if (!provider) throw new Error('MetaMask not installed')

      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as Address[]
      if (!accounts?.length) throw new Error('No accounts returned')

      let chainId = Number((await provider.request({ method: 'eth_chainId' })) as `0x${string}`)
      if (chainId !== SEPOLIA_CHAIN_ID) {
        // Switch to Sepolia
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_HEX }],
          })
        } catch (err: any) {
          // If chain doesn't exist, add it
          if (err.code === 4902) {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: SEPOLIA_CHAIN_HEX,
                  chainName: 'Sepolia',
                  rpcUrls: ['https://1rpc.io/sepolia'],
                  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                  blockExplorerUrls: ['https://sepolia.etherscan.io'],
                },
              ],
            })
          }
        }
        chainId = Number((await provider.request({ method: 'eth_chainId' })) as `0x${string}`)
      }

      return { address: getAddress(accounts[0]!), chainId }
    },

    async grantPermission(args) {
      const provider = getProvider()
      if (!provider) throw new Error('MetaMask not installed')

      const expiry = Math.floor(Date.now() / 1000) + DEFAULT_EXPIRY_SECONDS
      const amount = parseUnits(args.budgetUsdc, USDC_DECIMALS)
      const target = getAddress(args.targetAddress)
      const justification = args.justification ?? 'Crypto-Guardian swap execution'

      console.warn('[ERC7715] Requesting permission from MetaMask...')
      console.warn(`[ERC7715] Budget: ${args.budgetUsdc} USDC`)
      console.warn(`[ERC7715] Target: ${target}`)
      console.warn(`[ERC7715] Token: ${args.usdcAddress}`)

      // Retry logic for MetaMask permission requests (can be flaky with RPC)
      let lastError: Error | null = null
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          if (attempt > 1) {
            console.warn(`[ERC7715] Retrying MetaMask permission request (attempt ${attempt})...`)
            await new Promise(r => setTimeout(r, 1000)) // Wait 1s between retries
          }

          const granted = await erc7715Client(provider).requestExecutionPermissions([
            {
              chainId: SEPOLIA_CHAIN_ID,
              permission: {
                type: 'erc20-token-allowance',
                isAdjustmentAllowed: true,
                data: {
                  allowanceAmount: amount,
                  tokenAddress: args.usdcAddress,
                  justification,
                },
              },
              to: target,
              expiry,
            },
          ])

          const first = granted[0]
          if (!first) throw new Error('No permission granted')

          const delegations = decodeDelegations(first.context) as unknown as Delegation7710[]
          if (!delegations.length) throw new Error('No delegations decoded')

          console.warn('[ERC7715] Permission granted successfully!')
          console.warn(`[ERC7715] Delegations: ${delegations.length}`)
          console.warn(`[ERC7715] Expiry: ${new Date(expiry * 1000).toISOString()}`)

          return { delegations, expiry }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err))
          const errMsg = lastError.message
          
          // If user rejected, don't retry
          if (errMsg.includes('User rejected') || errMsg.includes('rejected')) {
            throw lastError
          }
          
          // If this is the last attempt, throw with helpful message
          if (attempt === 2) {
            if (errMsg.includes('Requested resource not found') || errMsg.includes('Failed to fetch token')) {
              throw new Error(
                'Could not verify USDC token on Sepolia (RPC issue). Please ensure:\n' +
                '1. MetaMask is on Sepolia network\n' +
                '2. Your internet connection is stable\n' +
                '3. Try again in a few moments\n\n' +
                'Original error: ' + errMsg
              )
            }
            throw lastError
          }
        }
      }

      throw lastError ?? new Error('Failed to grant permission')
    },
  }
}
