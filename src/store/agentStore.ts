import { create } from 'zustand'
import type { AgentAction, VerdictMap } from '@/lib/types'

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

  setStatus: (status) => set({ status }),
  setVerdicts: (verdicts) => set({ verdicts }),
  setPriorityCoin: (coin) => set({ priorityCoin: coin }),
  setReasoning: (reasoning) => set({ reasoning }),

  addAction: (action) =>
    set((state) => ({
      actionFeed: [action, ...state.actionFeed].slice(0, 50), // keep last 50
      totalSwapsExecuted:
        action.status === 'confirmed' ? state.totalSwapsExecuted + 1 : state.totalSwapsExecuted,
    })),

  setLastRunAt: (date) => set({ lastRunAt: date }),
  setNextRunAt: (date) => set({ nextRunAt: date }),
  setNewsSnippets: (snippets) => set({ newsSnippets: snippets }),

  addProtectedValue: (usdAmount) =>
    set((state) => ({ totalProtectedUSD: state.totalProtectedUSD + usdAmount })),

  setError: (error) => set({ error, status: error ? 'error' : 'idle' }),

  resetFeed: () =>
    set({
      actionFeed: [],
      verdicts: {},
      priorityCoin: null,
      reasoning: null,
      newsSnippets: {},
    }),
}))
