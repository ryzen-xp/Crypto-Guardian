import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CoinSettings, CoinSetting } from '@/lib/types'
import { DEFAULT_STABLECOIN } from '@/lib/coins'

const DEFAULT_COIN_SETTING: CoinSetting = {
  enabled: false,
  maxSwapUSD: 300,
  dailyLimitUSD: 600,
  minHoldUSD: 100,
  riskSensitivity: 'conservative',
}

type CoinStore = {
  // Which coins are selected for monitoring
  selectedCoins: string[]
  // Per-coin settings
  coinSettings: CoinSettings
  // Master pause toggle
  isPaused: boolean
  // Safe asset — user's chosen stablecoin to swap into on DANGER
  selectedStablecoin: string

  // Actions
  toggleCoin: (symbol: string) => void
  setSelectedCoins: (coins: string[]) => void
  updateCoinSetting: (symbol: string, setting: Partial<CoinSetting>) => void
  setCoinSettings: (settings: CoinSettings) => void
  togglePause: () => void
  setPaused: (paused: boolean) => void
  setSelectedStablecoin: (symbol: string) => void
  resetToDefaults: () => void
}

export const useCoinStore = create<CoinStore>()(
  persist(
    (set, get) => ({
      selectedCoins: [],
      coinSettings: {},
      isPaused: false,
      selectedStablecoin: DEFAULT_STABLECOIN,

      toggleCoin: (symbol) => {
        const { selectedCoins, coinSettings } = get()
        const isSelected = selectedCoins.includes(symbol)

        if (isSelected) {
          set({
            selectedCoins: selectedCoins.filter((s) => s !== symbol),
            coinSettings: {
              ...coinSettings,
              [symbol]: { ...DEFAULT_COIN_SETTING, enabled: false },
            },
          })
        } else {
          set({
            selectedCoins: [...selectedCoins, symbol],
            coinSettings: {
              ...coinSettings,
              [symbol]: coinSettings[symbol] ?? { ...DEFAULT_COIN_SETTING, enabled: true },
            },
          })
        }
      },

      setSelectedCoins: (coins) => {
        const { coinSettings } = get()
        const updatedSettings = { ...coinSettings }
        for (const symbol of coins) {
          if (!updatedSettings[symbol]) {
            updatedSettings[symbol] = { ...DEFAULT_COIN_SETTING, enabled: true }
          }
        }
        set({ selectedCoins: coins, coinSettings: updatedSettings })
      },

      updateCoinSetting: (symbol, setting) => {
        const { coinSettings } = get()
        set({
          coinSettings: {
            ...coinSettings,
            [symbol]: { ...(coinSettings[symbol] ?? DEFAULT_COIN_SETTING), ...setting },
          },
        })
      },

      setCoinSettings: (settings) => set({ coinSettings: settings }),

      togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

      setPaused: (paused) => set({ isPaused: paused }),

      setSelectedStablecoin: (symbol) => set({ selectedStablecoin: symbol }),

      resetToDefaults: () =>
        set({
          selectedCoins: [],
          coinSettings: {},
          isPaused: false,
          selectedStablecoin: DEFAULT_STABLECOIN,
        }),
    }),
    {
      name: 'cryptoguardian-coin-settings',
      version: 2, // bumped — new stablecoin field added
    }
  )
)
