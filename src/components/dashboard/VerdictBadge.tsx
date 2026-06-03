import { cn, getVerdictColors, getVerdictEmoji } from '@/lib/utils'
import type { Verdict } from '@/lib/types'

type Props = {
  verdict: Verdict
  size?: 'sm' | 'md' | 'lg'
  showEmoji?: boolean
}

export default function VerdictBadge({ verdict, size = 'md', showEmoji = true }: Props) {
  const colors = getVerdictColors(verdict)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold tracking-wide uppercase',
        colors.badge,
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-4 py-1.5 text-sm'
      )}
    >
      {showEmoji && <span>{getVerdictEmoji(verdict)}</span>}
      {verdict}
    </span>
  )
}
