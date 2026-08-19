import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import s from './MenuActions.module.css'

export type ActionItem = {
  key: string
  label: string
  onSelect: () => void
}

type MenuActionsProps = {
  /** Nom lu par les lecteurs d'écran, le bouton n'affichant que « … ». */
  ariaLabel: string
  items: ActionItem[]
}

/** Largeur mini du menu (doit suivre le `min-width` du CSS) et marge de bord :
 *  ensemble, elles empêchent le menu de sortir par la gauche de la fenêtre. */
const MENU_MIN_WIDTH = 176
const EDGE_GAP = 8

/** Bouton « … » ouvrant un menu d'actions.
 *
 *  Le menu part dans un portail sur `document.body` : rendu à sa place dans le
 *  tableau, il subissait le `overflow` du scroller (qui le rogne) et son
 *  animation `riseIn` (un ancêtre transformé devient le bloc conteneur d'un
 *  `position: fixed`, qui n'est alors plus positionné par rapport à la fenêtre). */
export function MenuActions({ ariaLabel, items }: MenuActionsProps) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  const toggle = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      // Coordonnées fenêtre : le menu est aligné sur le bord droit du bouton
      // (il se déploie vers la gauche, cf. translateX(-100%) dans le CSS).
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
    // Le menu est ancré à des coordonnées fenêtre : tout défilement le décroche
    // (`true` = phase de capture, pour attraper aussi le scroll du tableau).
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
