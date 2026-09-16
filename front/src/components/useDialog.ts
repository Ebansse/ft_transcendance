import { useEffect, useRef, type MouseEvent } from 'react'

/**
 * Pilote un `<dialog>` natif, qui fournit gratuitement le piège de focus, la
 * fermeture par Échap et l'inertie du reste de la page.
 *
 * S'utilise en étalant le résultat sur le `<dialog>` :
 *
 *     const dialog = useDialog(open, '#mon-champ', onClose)
 *     <dialog {...dialog} className={s.dialog}>…</dialog>
 *
 * @param open    la modale doit-elle être visible
 * @param focusOn sélecteur du premier élément à focaliser à l'ouverture ; sans
 *                ça `showModal()` poserait le focus sur la croix de fermeture.
 *                Changer de sélecteur redemande le focus sans refermer, ce qui
 *                suit le contenu quand la modale change d'onglet.
 * @param onClose appelé sur Échap et sur un clic dans le fond
 */
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
