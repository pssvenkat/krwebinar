// React is used implicitly via JSX transform
import { clsx } from 'clsx'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps {
  name?: string
  src?: string
  size?: AvatarSize
  className?: string
}

const sizeClass: Record<AvatarSize, string> = {
  xs: 'avatar-xs',
  sm: 'avatar-sm',
  md: 'avatar-md',
  lg: 'avatar-lg',
  xl: 'avatar-xl',
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
}

/** Deterministic color from name — always same color for same person */
function getColor(name: string): string {
  const colors = [
    '#1a4731', '#2d7a3a', '#4a90d9', '#7b5ea7',
    '#d4681a', '#c0392b', '#16a085', '#8e44ad',
  ]
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(hash) % colors.length]
}

export function Avatar({ name = '', src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ? `Avatar of ${name}` : 'Avatar'}
        className={clsx('avatar', sizeClass[size], className)}
      />
    )
  }

  const initials = getInitials(name) || '?'
  const bg = getColor(name)

  return (
    <div
      className={clsx('avatar avatar-initials', sizeClass[size], className)}
      style={{ background: bg }}
      aria-label={name ? `Avatar of ${name}` : 'Avatar'}
      role="img"
    >
      {initials}
    </div>
  )
}
