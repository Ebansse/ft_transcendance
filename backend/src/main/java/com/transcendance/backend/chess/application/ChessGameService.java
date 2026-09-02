package com.transcendance.backend.chess.application;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.github.bhlangonijr.chesslib.Board;
import com.github.bhlangonijr.chesslib.Side;
import com.github.bhlangonijr.chesslib.move.Move;
import com.transcendance.backend.chess.domain.ChessMatchStatus;
import com.transcendance.backend.chess.domain.ChessSide;
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
     * @param botLevel    the level of the bot (1-10)
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

    /**
     * Play a move in an existing match.
     *
     * @param matchId  the ID of the match
     * @param playerId the ID of the player making the move
     * @param move     the move in algebraic notation (e.g., "e2e4")
     * @return the updated match entity
     * @throws IllegalArgumentException if the match is not found, if the player is not part of the match,
     *                                  if it's not the player's turn, or if the move is illegal
     */
    @Transactional
    public ChessMatchEntity playMove(long matchId, UUID playerId, String move) {
        ChessMatchEntity match = chessMatchRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found"));
        Board board = match.toBoard();
        if (!isValidMoveFormat(move)) {
            throw new IllegalArgumentException("Invalid move format");
        }
        if (!isPlayerInMatch(match, playerId)) {
            throw new IllegalArgumentException("Player is not part of this match");
        }

        if (match.getStatus() != ChessMatchStatus.IN_PROGRESS) {
            throw new IllegalArgumentException("Match is not in progress");
        }
        if (match.getWhitePlayer().getUserId().equals(playerId)) {
            if (board.getSideToMove() != Side.WHITE) {
                throw new IllegalArgumentException("It's not your turn");
            }
        } else {
            if (board.getSideToMove() != Side.BLACK) {
                throw new IllegalArgumentException("It's not your turn");
            }
        }
        if (!canMovePlay(board, move)) {
            throw new IllegalArgumentException("Illegal move");
        }
        board.doMove(new Move(move, board.getSideToMove()));
        endGame(board, match);
        match.setFen(board.getFen());
        chessMatchRepository.save(match);
        return match;
    }

    /**
     * Check if a player is part of a match.
     *
     * @param match    the match entity
     * @param playerId the ID of the player
     * @return true if the player is part of the match, false otherwise
     */
    private boolean isPlayerInMatch(ChessMatchEntity match, UUID playerId) {
        return match.getWhitePlayer().getUserId().equals(playerId) ||
                (match.getBlackPlayer() != null && match.getBlackPlayer().getUserId().equals(playerId));
    }

    /**
     * Check if a move can be played on the current board.
     *
     * @param board the current chess board
     * @param move  the move in algebraic notation
     * @return true if the move is legal, false otherwise
     */
    private boolean canMovePlay(Board board, String move) {
        Move chessMove = new Move(move, board.getSideToMove());
        return board.legalMoves().contains(chessMove);
    }

    /**
     * Check if the game has ended (checkmate, stalemate, or draw) and update the match status accordingly.
     *
     * @param board the current chess board
     * @param match the match entity to update
     * @return true if the game has ended, false otherwise
     */
    private boolean endGame(Board board, ChessMatchEntity match) {
        if (board.isMated()) {
            match.setStatus(ChessMatchStatus.CHECKMATE);
            match.setWinnerSide(board.getSideToMove() == Side.WHITE ? ChessSide.BLACK : ChessSide.WHITE);
            return true;
        }
        if (board.isStaleMate()) {
            match.setStatus(ChessMatchStatus.STALEMATE);
            return true;
        }
        if (board.isDraw()) {
            match.setStatus(ChessMatchStatus.DRAW);
            return true;
        }
        return false;
    }

    /**
     * Validate the format of a chess move.
     *
     * @param move the move in algebraic notation
     * @return true if the move format is valid, false otherwise
     */
    public boolean isValidMoveFormat(String move) {
        return move != null && move.matches("^[a-h][1-8][a-h][1-8][qrbn]?$");
    }
}
