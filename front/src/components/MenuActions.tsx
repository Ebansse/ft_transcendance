import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import s from './MenuActions.module.css'

export type ActionItem = {
  key: string
  label: string
  onSelect: () => void
}

type MenuActionsProps = {
  ariaLabel: string
  items: ActionItem[]
}

const MENU_MIN_WIDTH = 176
const EDGE_GAP = 8

// Bouton « … » ouvrant un menu d'actions.
export function MenuActions({ ariaLabel, items }: MenuActionsProps) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  const toggle = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      setAnchor({
        top: rect.bottom + 6,
        left: Math.max(rect.right, MENU_MIN_WIDTH + EDGE_GAP),
      })
    }
    setOpen((previous) => !previous)
  }

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open, close])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={s.trigger}
        onClick={toggle}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        …
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className={s.menu}
            role="menu"
            style={{ top: `${anchor.top}px`, left: `${anchor.left}px` }}
          >
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={s.item}
                role="menuitem"
                onClick={() => {
                  close()
                  item.onSelect()
                }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
