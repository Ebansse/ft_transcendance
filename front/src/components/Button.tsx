import type { ReactNode } from 'react'
import s from './Button.module.css'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'nav'

type ButtonProps = {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: ButtonVariant
  fullWidth?: boolean
  ariaLabel?: string
  type?: 'button' | 'submit'
}

export function Button({
  children,
  onClick,
  disabled = false,
  variant = 'secondary',
  fullWidth = false,
  ariaLabel,
  type = 'button',
}: ButtonProps) {
  const classes = [s.btn, s[variant]]
  if (fullWidth) classes.push(s.full)

  return (
    <button
      type={type}
      className={classes.join(' ')}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}
