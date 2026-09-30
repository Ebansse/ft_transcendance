import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthModal } from '../auth/authModalContext.ts'
import { createBotMatch, getMyChessMatch, playChessMove, resignChessMatch } from '../lib/actions.ts'
import { ApiError, errorMessage } from '../lib/apiClient.ts'
import {
  CHESS_MATCHES,
  CHESS_MOVES,
  type ChessMatchDto,
  type ChessMovePlayedDto,
  type ChessSide,
} from '../lib/chessClient.ts'
import { useSocket } from './socketContext.ts'

/** Le dernier coup reçu du serveur, avec un compteur : deux fois le même coup
 *  doit rester deux événements distincts pour que la page les rejoue tous deux. */
type ServerMove = { move: string; count: number }

/** Détient la partie telle que le serveur la voit, et rien d'autre : ni plateau,
 *  ni chess.js, ni sélection. La page se resynchronise sur `match.fen`.
 *
 *  Trois sources d'un même état : le chargement initial (qui restaure la partie
 *  après un rechargement), les coups adverses sur `chess.moves`, et les
 *  changements de partie sur `chess.matches`. */
export function useChessMatch() {
  const { subscribe } = useSocket()
  const { user } = useAuthModal()
  const location = useLocation()

  const [match, setMatch] = useState<ChessMatchDto | null>(null)
  const [serverMove, setServerMove] = useState<ServerMove | null>(null)
  const [error, setError] = useState<string | null>(null)

  /* `location.key` et pas seulement le montage : accepter une invitation alors
     qu'on est déjà sur la page renavigue vers /chess sans remonter le
     composant. */
  useEffect(() => {
    let alive = true

    getMyChessMatch()
      .then((current) => {
        if (alive) setMatch(current)
      })
      .catch((err: unknown) => {
        if (!alive) return
        // 404 = aucune partie en cours, cas normal. 401/403 = session expirée,
        // dont la couche d'auth s'occupe déjà.
        const quiet = err instanceof ApiError && [404, 403, 401].includes(err.status)
        if (quiet) setMatch(null)
        else setError(errorMessage(err, 'Partie en cours introuvable.'))
      })

    return () => {
      alive = false
    }
  }, [location.key])

  useEffect(
    () =>
      subscribe(CHESS_MOVES, (body) => {
        const played = JSON.parse(body) as ChessMovePlayedDto
        setMatch(played.match)
        setServerMove((previous) => ({ move: played.move, count: (previous?.count ?? 0) + 1 }))
      }),
    [subscribe],
  )

  useEffect(
    () =>
      subscribe(CHESS_MATCHES, (body) => {
        // Démarrage comme fin de partie : le serveur envoie la partie entière.
        setMatch(JSON.parse(body) as ChessMatchDto)
      }),
    [subscribe],
  )

  /** Envoie un coup en UCI. Un refus laisse `match` sur la position serveur, ce
   *  qui suffit à la page pour annuler son coup optimiste. */
  const play = async (matchId: number, move: string) => {
    setError(null)
    try {
      setMatch(await playChessMove(matchId, move))
    } catch (err: unknown) {
      setError(errorMessage(err, 'Coup refusé.'))
      // Le contenu ne change pas — c'est la référence qui compte : elle relance
      // la resynchronisation de la page, qui reprend le FEN du serveur.
      setMatch((previous) => (previous === null ? null : { ...previous }))
    }
  }

  /** Ne rattrape pas l'erreur : l'appelant tient la modale ouverte et y affiche
   *  le refus, là où l'utilisateur vient de cliquer. */
  const startBot = async (side: ChessSide, botLvl: number) => {
    setError(null)
    const created = await createBotMatch(side, botLvl)

    /* Rien n'arrive par la socket contre un bot : un coup resté d'une partie
       précédente serait rejoué sur celle-ci. */
    setServerMove(null)
    setMatch(created)
  }

  const resign = async (matchId: number) => {
    setError(null)
    try {
      setMatch(await resignChessMatch(matchId))
    } catch (err: unknown) {
      setError(errorMessage(err, 'Abandon impossible.'))
    }
  }

  /** Referme une partie terminée pour rendre la page à son mode local. */
  const leave = () => {
    setMatch(null)
    setServerMove(null)
    setError(null)
  }

  const mySide: ChessSide | null =
    match === null || user === null ? null : match.whitePlayerId === user.id ? 'WHITE' : 'BLACK'

  const isMyTurn =
    match !== null && mySide !== null && match.status === 'IN_PROGRESS' && match.sideToMove === mySide

  return { match, mySide, isMyTurn, serverMove, error, play, resign, leave, startBot }
}
