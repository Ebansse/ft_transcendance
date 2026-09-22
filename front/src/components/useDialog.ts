import { useEffect, useRef, type MouseEvent } from 'react'

/** Pilote un `<dialog>` natif, qui fournit le piège de focus, Échap et
 *  l'inertie du reste de la page. S'étale sur l'élément :
 *
 *      <dialog {...useDialog(open, '#mon-champ', onClose)}>…</dialog>
 *
 *  `focusOn` désigne le premier élément à focaliser ; sans lui `showModal()`
 *  poserait le focus sur la croix de fermeture. */
export function useDialog(open: boolean, focusOn: string, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (!open) {
      if (dialog.open) dialog.close()
      return
    }
    if (!dialog.open) dialog.showModal()
    dialog.querySelector<HTMLElement>(focusOn)?.focus()
  }, [open, focusOn])

  return {
    ref,
    onClose,
    onClick: (event: MouseEvent) => {
      // La cible n'est le <dialog> lui-même que sur un clic dans le fond.
      if (event.target === ref.current) onClose()
    },
  }
}
