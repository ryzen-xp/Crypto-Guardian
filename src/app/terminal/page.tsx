'use client'

import { useEffect, useRef, useState } from 'react'
import { Terminal, Trash2, ChevronDown } from 'lucide-react'
import Header from '@/components/layout/Header'
import { useAgentStore } from '@/store/agentStore'
import { cn, formatCountdown } from '@/lib/utils'
import type { TerminalLineType } from '@/lib/types'

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [formatted, setFormatted] = useState('—')

  useEffect(() => {
    const update = () => {
      const diff = targetDate.getTime() - Date.now()
      if (diff <= 0) {
        setFormatted('now')
      } else {
        setFormatted(formatCountdown(targetDate))
      }
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return <span>{formatted}</span>
}

// ─── Styling maps ─────────────────────────────────────────────────────────────

const LINE_COLOR: Record<TerminalLineType, string> = {
  header:  'text-cyan-400 font-bold tracking-wide',
  system:  'text-blue-400',
  info:    'text-gray-300',
  ai:      'text-purple-300',
  success: 'text-emerald-400',
  warning: 'text-yellow-400',
  error:   'text-red-400',
}

const LINE_PREFIX: Record<TerminalLineType, string> = {
  header:  '',
  system:  '[SYS] ',
  info:    '[INF] ',
  ai:      '[AI]  ',
  success: '[OK]  ',
  warning: '[WRN] ',
  error:   '[ERR] ',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TerminalPage() {
  const {
    terminalLines,
    clearTerminal,
    perCoinReasoning,
    coinPriorities,
    status,
    nextRunAt,
    priorityCoin,
  } = useAgentStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [terminalLines, autoScroll])

  // Detect manual scroll up to disable auto-scroll
  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setAutoScroll(atBottom)
  }

  // Unique coins seen in logs
  const coinsInLogs = Array.from(
    new Set(terminalLines.map((l) => l.coin).filter(Boolean) as string[])
  )

  const filtered = filter === 'all'
    ? terminalLines
    : terminalLines.filter((l) => !l.coin || l.coin === filter)

  const priorityCoins = Object.entries(coinPriorities)
    .sort(([, a], [, b]) => b - a)

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Page header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-green-400" />
            <h1 className="text-base font-bold text-green-400">AI Agent Terminal</h1>
            <span className="ml-2 rounded-full border border-green-500/20 bg-green-500/5 px-2 py-0.5 font-mono text-[10px] text-green-600">
              {terminalLines.length} lines
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Coin filter */}
            {coinsInLogs.length > 0 && (
              <div className="flex items-center gap-1">
                {(['all', ...coinsInLogs] as string[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setFilter(c)}
                    className={cn(
                      'rounded px-2 py-0.5 font-mono text-xs transition-colors',
                      filter === c
                        ? 'bg-green-500/20 text-green-400'
                        : 'text-gray-500 hover:text-gray-300'
                    )}
                  >
                    {c === 'all' ? 'ALL' : c}
                  </button>
                ))}
              </div>
            )}

            {/* Auto-scroll indicator */}
            {!autoScroll && (
              <button
                onClick={() => { setAutoScroll(true); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
                className="flex items-center gap-1 rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400 hover:bg-yellow-500/20"
              >
                <ChevronDown className="h-3 w-3" />
                Scroll to bottom
              </button>
            )}

            <button
              onClick={clearTerminal}
              disabled={terminalLines.length === 0}
              className="flex items-center gap-1 rounded border border-gray-700 px-2 py-1 text-xs text-gray-500 hover:border-gray-500 hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          </div>
        </div>

        {/* Priority sidebar + terminal */}
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          {/* ── Terminal window ─────────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-xl border border-green-500/20 bg-black shadow-lg shadow-green-500/5">
            {/* macOS-style chrome */}
            <div className="flex items-center gap-2 border-b border-green-500/10 bg-gray-950 px-4 py-2.5">
              <span className="h-3 w-3 rounded-full bg-red-500/70" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
              <span className="h-3 w-3 rounded-full bg-green-500/70" />
              <span className="ml-3 font-mono text-xs text-green-700">
                cryptoguardian-agent — zsh — ai-terminal
              </span>
            </div>

            {/* Log body */}
            <div
              ref={containerRef}
              onScroll={handleScroll}
              className="h-[calc(100vh-310px)] min-h-[400px] overflow-y-auto p-4 font-mono text-xs leading-6"
            >
              {filtered.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <Terminal className="h-10 w-10 text-green-900" />
                  <p className="text-green-800">$ waiting for agent scan...</p>
                  <p className="text-[10px] text-gray-800">
                    Run a scan from the Dashboard to see live AI analysis here
                  </p>
                </div>
              ) : (
                filtered.map((line) => {
                  const isHeader = line.type === 'header'
                  return (
                    <div
                      key={line.id}
                      className={cn(
                        'flex gap-2',
                        isHeader ? 'mb-1 mt-3 border-t border-green-900/30 pt-2' : 'mb-0.5'
                      )}
                    >
                      {/* Timestamp */}
                      <span className="w-[68px] shrink-0 text-[10px] text-green-900">
                        {new Date(line.ts).toLocaleTimeString('en-US', { hour12: false })}
                      </span>

                      {/* Prefix */}
                      <span className="w-[40px] shrink-0 text-[10px] text-green-800">
                        {isHeader ? '' : LINE_PREFIX[line.type]}
                      </span>

                      {/* Coin tag */}
                      {line.coin ? (
                        <span className="w-[44px] shrink-0 rounded bg-white/5 px-1 text-center text-[10px] font-bold text-gray-400">
                          {line.coin}
                        </span>
                      ) : (
                        <span className="w-[44px] shrink-0" />
                      )}

                      {/* Content */}
                      <span className={cn('flex-1 break-all', LINE_COLOR[line.type])}>
                        {line.content}
                      </span>
                    </div>
                  )
                })
              )}

              {/* Blinking cursor */}
              <div className="mt-2 flex items-center gap-1.5 font-mono text-green-600">
                <span className="text-green-700">agent@cryptoguardian:~$</span>
                <span className="inline-block h-4 w-2 animate-pulse bg-green-500" />
              </div>

              <div ref={bottomRef} />
            </div>
          </div>

          {/* ── Sidebar: Priority & Reasoning ────────────────────────────────── */}
          <div className="space-y-4">
            {/* Scan Scheduler */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Agent Status
              </p>
              <div className="space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Status:</span>
                  <span className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                    status === 'running' ? 'bg-blue-500/10 text-blue-400 animate-pulse' :
                    status === 'active' ? 'bg-green-500/10 text-green-400' :
                    status === 'error' ? 'bg-red-500/10 text-red-400' :
                    'bg-gray-800 text-gray-500'
                  )}>
                    {status || 'IDLE'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Next Scan:</span>
                  <span className="font-bold text-yellow-400">
                    {nextRunAt ? <CountdownTimer targetDate={new Date(nextRunAt)} /> : '—'}
                  </span>
                </div>
                {priorityCoin && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Next Target:</span>
                    <span className="font-bold text-cyan-400">{priorityCoin}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Priority scores */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Asset Priority
              </p>
              {priorityCoins.length === 0 ? (
                <p className="text-xs text-gray-600">Run a scan to see priorities</p>
              ) : (
                <div className="space-y-2">
                  {priorityCoins.map(([symbol, score]) => {
                    const label = score === 4 ? 'DANGER' : score === 3 ? 'OPPORT.' : score === 2 ? 'CAUTION' : 'NEUTRAL'
                    const barColor = score === 4 ? 'bg-red-500' : score === 3 ? 'bg-green-500' : score === 2 ? 'bg-yellow-500' : 'bg-gray-600'
                    const textColor = score === 4 ? 'text-red-400' : score === 3 ? 'text-green-400' : score === 2 ? 'text-yellow-400' : 'text-gray-500'
                    const pct = (score / 4) * 100
                    return (
                      <div key={symbol}>
                        <div className="mb-0.5 flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-white">{symbol}</span>
                          <span className={cn('text-[10px] font-semibold', textColor)}>{label}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                          <div
                            className={cn('h-full rounded-full transition-all duration-700', barColor)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Per-coin reasoning */}
            {Object.keys(perCoinReasoning).length > 0 && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <p className="mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  AI Reasoning
                </p>
                <div className="space-y-3">
                  {Object.entries(perCoinReasoning).map(([symbol, reason]) => (
                    <div key={symbol}>
                      <span className="mb-1 block font-mono text-xs font-bold text-gray-300">
                        {symbol}
                      </span>
                      <p className="text-[11px] leading-relaxed text-gray-500">{reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Legend</p>
              <div className="space-y-1.5 font-mono text-[10px]">
                {(Object.entries(LINE_COLOR) as [TerminalLineType, string][]).map(([type, cls]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className={cn('w-12', cls)}>{LINE_PREFIX[type] || '[HDR]'}</span>
                    <span className="text-gray-600">{type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
