import { create } from 'zustand'
import type { AgentAction, TerminalLine, VerdictMap } from '@/lib/types'

type AgentStatus = 'idle' | 'running' | 'active' | 'paused' | 'error'

type AgentStore = {
  status: AgentStatus
  verdicts: VerdictMap
  priorityCoin: string | null
  reasoning: string | null
  actionFeed: AgentAction[]
  lastRunAt: Date | null
  nextRunAt: Date | null
  newsSnippets: Record<string, string>
  totalProtectedUSD: number
  totalSwapsExecuted: number
  error: string | null

  // Terminal logs — accumulated across all scans
  terminalLines: TerminalLine[]
  // Per-coin AI reasoning from last scan
  perCoinReasoning: Record<string, string>
  // Per-coin priority scores from last scan (4=DANGER … 1=NEUTRAL)
  coinPriorities: Record<string, number>

  // Actions
  setStatus: (status: AgentStatus) => void
  setVerdicts: (verdicts: VerdictMap) => void
  setPriorityCoin: (coin: string | null) => void
  setReasoning: (reasoning: string | null) => void
  addAction: (action: AgentAction) => void
  setLastRunAt: (date: Date | null) => void
  setNextRunAt: (date: Date | null) => void
  setNewsSnippets: (snippets: Record<string, string>) => void
  addProtectedValue: (usdAmount: number) => void
  setError: (error: string | null) => void
  resetFeed: () => void

  // Terminal
  addTerminalLines: (lines: TerminalLine[]) => void
  clearTerminal: () => void
  setPerCoinReasoning: (r: Record<string, string>) => void
  setCoinPriorities: (p: Record<string, number>) => void
}

export const useAgentStore = create<AgentStore>()((set) => ({
  status: 'idle',
  verdicts: {},
  priorityCoin: null,
  reasoning: null,
  actionFeed: [],
  lastRunAt: null,
  nextRunAt: null,
  newsSnippets: {},
  totalProtectedUSD: 0,
  totalSwapsExecuted: 0,
  error: null,

  terminalLines: [],
  perCoinReasoning: {},
  coinPriorities: {},

  setStatus: (status) => set({ status }),
  setVerdicts: (verdicts) => set({ verdicts }),
  setPriorityCoin: (coin) => set({ priorityCoin: coin }),
  setReasoning: (reasoning) => set({ reasoning }),

  addAction: (action) =>
    set((state) => ({
      actionFeed: [action, ...state.actionFeed].slice(0, 50),
      totalSwapsExecuted:
        action.status === 'confirmed' ? state.totalSwapsExecuted + 1 : state.totalSwapsExecuted,
    })),

  setLastRunAt: (date) => set({ lastRunAt: date }),
  setNextRunAt: (date) => set({ nextRunAt: date }),
  setNewsSnippets: (snippets) => set({ newsSnippets: snippets }),

  addProtectedValue: (usdAmount) =>
    set((state) => ({ totalProtectedUSD: state.totalProtectedUSD + usdAmount })),

  setError: (error) => set((state) => ({ error, status: error ? 'error' : state.status })),

  resetFeed: () =>
    set({ actionFeed: [], verdicts: {}, priorityCoin: null, reasoning: null, newsSnippets: {} }),

  // Terminal actions
  addTerminalLines: (lines) =>
    set((state) => ({
      // Keep last 500 lines total to avoid memory bloat
      terminalLines: [...state.terminalLines, ...lines].slice(-500),
    })),

  clearTerminal: () => set({ terminalLines: [] }),
  setPerCoinReasoning: (r) => set({ perCoinReasoning: r }),
  setCoinPriorities: (p) => set({ coinPriorities: p }),
}))
