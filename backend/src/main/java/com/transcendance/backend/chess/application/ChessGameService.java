package com.transcendance.backend.chess.application;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.github.bhlangonijr.chesslib.Board;
import com.transcendance.backend.chess.persistence.entity.ChessMatchEntity;
import com.transcendance.backend.chess.persistence.repository.ChessMatchEntityRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ChessGameService {

    private final ChessMatchEntityRepository chessMatchRepository;
    private final ChessPlayerService chessPlayerService;

    /**
     * Create a match between two human players.
     *
     * The caller decides the colours: this service only records them.
     *
     * @param whiteUserId the user playing white
     * @param blackUserId the user playing black
     * @return the persisted match
     * @throws IllegalArgumentException if both sides are the same user, or if
     *                                  either of them is already in a match
     */
    @Transactional
    public ChessMatchEntity createNewGame(UUID whiteUserId, UUID blackUserId) {

        if (whiteUserId.equals(blackUserId)) {
            throw new IllegalArgumentException("Cannot create a game with yourself");
        }
        if (chessMatchRepository.existsActiveMatch(whiteUserId)) {
            throw new IllegalArgumentException("White player already has an active match");
        }
        if (chessMatchRepository.existsActiveMatch(blackUserId)) {
            throw new IllegalArgumentException("Black player already has an active match");
        }

        Board chessBoard = new Board();
        ChessMatchEntity chessMatch = new ChessMatchEntity(
                chessBoard,
                chessPlayerService.getOrCreatePlayer(whiteUserId),
                chessPlayerService.getOrCreatePlayer(blackUserId));

        return chessMatchRepository.save(chessMatch);
    }

    /**
     * Create a match against the bot, the human playing white.
     * The bot will play as black.
     *
     * @param whiteUserId the user playing white
     * @param botLevel the level of the bot (1-10)
     * @return the persisted match
     * @throws IllegalArgumentException if the user already has an active match
     */
    @Transactional
    public ChessMatchEntity createNewGameAgainstBot(UUID whiteUserId, int botLevel) {

        if (chessMatchRepository.existsActiveMatch(whiteUserId)) {
            throw new IllegalArgumentException("You already have an active match");
        }

        Board chessBoard = new Board();
        ChessMatchEntity chessMatch = new ChessMatchEntity(
                chessBoard,
                chessPlayerService.getOrCreatePlayer(whiteUserId),
                null);
        chessMatch.setBlackBotLevel(botLevel);

        return chessMatchRepository.save(chessMatch);
    }
}
