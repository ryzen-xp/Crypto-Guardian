'use client'

import { ConnectKitButton } from 'connectkit'

export default function ConnectKitButtonWrapper() {
  return (
    <ConnectKitButton.Custom>
      {({ isConnected, isConnecting, show, truncatedAddress, ensName }) => (
        <button
          onClick={show}
          disabled={isConnecting}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:opacity-50"
        >
          {isConnected ? ensName || truncatedAddress : isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </ConnectKitButton.Custom>
  )
}
