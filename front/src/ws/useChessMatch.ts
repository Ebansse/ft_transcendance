import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthModal } from '../auth/authModalContext.ts'
import {
  createBotMatch,
  getMyChessMatch,
  playChessMove,
  resignChessMatch,
} from '../lib/actions.ts'
import { ApiError } from '../lib/apiClient.ts'
import {
  CHESS_MATCHES,
  CHESS_MOVES,
  type ChessMatchDto,
  type ChessMovePlayedDto,
  type ChessSide,
} from '../lib/chessClient.ts'
import { useSocket } from './socketContext.ts'

function messageOf(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback
}

/** Le dernier coup reçu du serveur, avec un compteur : deux fois le même coup
 *  (une reprise, un aller-retour) doit rester deux événements distincts pour
 *  que la page les rejoue tous les deux. */
type ServerMove = { move: string; count: number }

/** Détient la partie telle que le serveur la voit, et rien d'autre : ni
 *  plateau, ni chess.js, ni sélection. La page reste maîtresse de l'affichage
 *  et se resynchronise sur `match.fen`, seule vérité de la position.
 *
 *  Trois sources d'un même état : le chargement initial (`GET /chess/matches/me`,
 *  qui restaure la partie après un rechargement de page), les coups adverses
 *  poussés sur `chess.moves`, et les changements de partie sur `chess.matches`
 *  (démarrage, abandon adverse, fin). */
export function useChessMatch() {
  const { subscribe } = useSocket()
  const { user } = useAuthModal()

  const location = useLocation()

  const [match, setMatch] = useState<ChessMatchDto | null>(null)
  const [serverMove, setServerMove] = useState<ServerMove | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* `location.key` et pas seulement le montage : accepter une invitation alors
     qu'on est déjà sur la page renavigue vers /chess sans remonter le
     composant — sans cette dépendance, la partie n'apparaîtrait qu'au
     rechargement. */
  useEffect(() => {
    let alive = true
    setLoading(true)

    getMyChessMatch()
      .then((current) => {
        if (alive) setMatch(current)
      })
      .catch((err: unknown) => {
        if (!alive) return
        // 404 = aucune partie en cours, cas normal. 401/403 = session expirée,
        // dont la couche d'auth s'occupe déjà : la page n'a rien à ajouter.
        const quiet = err instanceof ApiError && [404, 403, 401].includes(err.status)
        if (quiet) setMatch(null)
        else setError(messageOf(err, 'Partie en cours introuvable.'))
      })
      .finally(() => {
        if (alive) setLoading(false)
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
        // Démarrage comme fin de partie : dans les deux cas le serveur envoie
        // la partie entière, on la prend telle quelle.
        setMatch(JSON.parse(body) as ChessMatchDto)
      }),
    [subscribe],
  )

  /** Envoie un coup en UCI. La réponse porte la partie d'après : on la garde,
   *  et un refus (pas ton tour, coup illégal) laisse `match` sur la position
   *  serveur, ce qui suffit à la page pour annuler son coup optimiste. */
  const play = useCallback(async (matchId: number, move: string) => {
    setError(null)
    try {
      setMatch(await playChessMove(matchId, move))
    } catch (err: unknown) {
      setError(messageOf(err, 'Coup refusé.'))
      // Le contenu ne change pas — c'est la référence qui compte : elle
      // relance la resynchronisation de la page, qui reprend le FEN du
      // serveur et annule ainsi le coup joué en avance.
      setMatch((previous) => (previous === null ? null : { ...previous }))
    }
  }, [])

  /** Ouvre une partie contre le bot et l'installe comme partie courante.
   *
   *  Ne rattrape pas l'erreur : l'appelant tient la modale ouverte et y affiche
   *  le refus (déjà une partie en cours), là où l'utilisateur vient de cliquer. */
  const startBot = useCallback(async (side: ChessSide, botLvl: number) => {
    setError(null)
    const created = await createBotMatch(side, botLvl)

    /* Rien n'arrive par la socket dans une partie contre bot : un coup resté
       d'une partie précédente serait rejoué sur celle-ci. */
    setServerMove(null)
    setMatch(created)
  }, [])

  const resign = useCallback(async (matchId: number) => {
    setError(null)
    try {
      setMatch(await resignChessMatch(matchId))
    } catch (err: unknown) {
      setError(messageOf(err, 'Abandon impossible.'))
    }
  }, [])

  /** Referme une partie terminée pour rendre la page à son mode local. Le
   *  serveur, lui, n'a plus rien à en dire : elle n'est plus active. */
  const leave = useCallback(() => {
    setMatch(null)
    setServerMove(null)
    setError(null)
  }, [])

  const mySide: ChessSide | null =
    match === null || user === null ? null : match.whitePlayerId === user.id ? 'WHITE' : 'BLACK'

  const isMyTurn =
    match !== null && mySide !== null && match.status === 'IN_PROGRESS' && match.sideToMove === mySide

  return { match, mySide, isMyTurn, serverMove, loading, error, play, resign, leave, startBot }
}
