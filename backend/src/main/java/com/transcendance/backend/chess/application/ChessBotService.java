package com.transcendance.backend.chess.application;

import java.util.LinkedList;
import java.util.List;
import java.util.Random;

import org.springframework.stereotype.Service;

import com.github.bhlangonijr.chesslib.Board;
import com.github.bhlangonijr.chesslib.move.Move;
import com.transcendance.backend.chess.domain.BotProfile;
import com.transcendance.backend.chess.domain.ChessSearch;

import io.github.colonelparrot.jchessify.OpeningBook;


@Service
public class ChessBotService {

    private final Random random;

    public ChessBotService() {
        this(new Random());
    }

    ChessBotService(Random random) {
        this.random = random;
    }

    /**
     * The move to play in this position, at this level.
     *
     * @param board the position to move in, restored to its original state on
     *              return
     * @param level the bot's strength, 1 to 10
     * @return a legal move, always
     * @throws IllegalStateException if the position has no legal move at all,
     *                               which means the caller let a finished game
     *                               through
     */
    public Move chooseBotMove(Board board, int level) {
        BotProfile profile = BotProfile.ofLevel(level);
        List<Move> moves = board.legalMoves();
        //TODO: Rajouter les coup douverture et calculer les coups perpetuelle
        /* OpeningBook openingBook = new OpeningBook();
        LinkedList<Long> history = board.getHistory();
        openingBook.findNextMove(history.toString()); */

        if (moves.isEmpty()) {
            throw new IllegalStateException(
                    "The bot has no move to play: this position is already over");
        }

        if (random.nextDouble() < profile.blunderChance()) {
            return moves.get(random.nextInt(moves.size()));
        }

        Move best = moves.get(0);
        int bestScore = -ChessSearch.INFINITY;

        for (Move move : moves) {
            board.doMove(move);
            int score = -ChessSearch.negamax(board, profile.depth() - 1,
                    -ChessSearch.INFINITY, ChessSearch.INFINITY);
            board.undoMove();

            score += noise(profile.evalNoise());

            if (score > bestScore) {
                bestScore = score;
                best = move;
            }
        }

        return best;
    }

    private int noise(int amplitude) {
        return random.nextInt(2 * amplitude + 1) - amplitude;
    }
}
