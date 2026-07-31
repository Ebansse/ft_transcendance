import type { ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'nav'

type ButtonProps = {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: ButtonVariant
  fullWidth?: boolean
  ariaLabel?: string
}

export function Button({
  children,
  onClick,
  disabled = false,
  variant = 'secondary',
  fullWidth = false,
  ariaLabel,
}: ButtonProps) {
  const classes = ['btn', `btn-${variant}`]
  if (fullWidth) classes.push('btn-full')

  return (
    <button
      type="button"
      className={classes.join(' ')}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}
