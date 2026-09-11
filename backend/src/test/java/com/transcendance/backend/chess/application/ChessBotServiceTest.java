package com.transcendance.backend.chess.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Random;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.github.bhlangonijr.chesslib.Board;
import com.github.bhlangonijr.chesslib.Piece;
import com.github.bhlangonijr.chesslib.PieceType;
import com.github.bhlangonijr.chesslib.Side;
import com.github.bhlangonijr.chesslib.move.Move;

/**
 * The service holds nothing but a Random, so it is built by hand here rather
 * than through a Spring context. Seeding that Random is what makes the games
 * below repeatable: these tests either pass or fail, they never flake.
 */
class ChessBotServiceTest {

    /** White mates in one with Ra8. */
    private static final String MATE_IN_ONE = "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1";

    /** Queen on d1, black pawn on d5 defended by the pawn on e6. */
    private static final String POISONED_PAWN = "4k3/8/4p3/3p4/8/8/8/3QK3 w - - 0 1";

    private static Board at(String fen) {
        Board board = new Board();
        board.loadFromFen(fen);
        return board;
    }

    private static ChessBotService seeded(long seed) {
        return new ChessBotService(new Random(seed));
    }

    @Test
    @DisplayName("level 10 finds the mate every single time")
    void topLevelNeverMissesAMate() {
        ChessBotService bot = seeded(42);

        // Twenty runs rather than one: level 10 has no noise and no blunder, so
        // this is the test that says so out loud.
        for (int attempt = 0; attempt < 20; attempt++) {
            assertEquals("a1a8", bot.chooseBotMove(at(MATE_IN_ONE), 10).toString(),
                    "missed the mate on attempt " + attempt);
        }
    }

    @Test
    @DisplayName("every level always returns a legal move")
    void alwaysPlaysSomethingLegal() {
        ChessBotService bot = seeded(7);
        List<String> positions = List.of(
                new Board().getFen(),
                POISONED_PAWN,
                "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
                "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1");

        for (String fen : positions) {
            for (int level = 1; level <= 10; level++) {
                Board board = at(fen);
                Move played = bot.chooseBotMove(board, level);

                assertTrue(board.legalMoves().contains(played),
                        "level %d played %s, not legal in %s".formatted(level, played, fen));
            }
        }
    }

    @Test
    @DisplayName("gives the board back exactly as it was")
    void leavesTheBoardUntouched() {
        ChessBotService bot = seeded(3);
        Board board = at("r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4");
        String before = board.getFen();

        bot.chooseBotMove(board, 8);

        assertEquals(before, board.getFen());
    }

    @Test
    @DisplayName("a finished position is the caller's bug, not a random move")
    void refusesToMoveInAFinishedPosition() {
        ChessBotService bot = seeded(1);
        // The mate-in-one position after Ra8: Black is checked on the eighth rank
        // with nowhere to go and nothing able to interpose.
        Board mated = at("R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1");

        assertThrows(IllegalStateException.class, () -> bot.chooseBotMove(mated, 5));
    }

    /**
     * Depth is the level's first knob, and this is where it shows: given a pawn
     * that cannot be taken, level 1 looks one half-move ahead and grabs it,
     * while a deeper level sees the recapture coming and leaves it alone.
     */
    @Test
    @DisplayName("only the deeper levels see through the poisoned pawn")
    void depthSeparatesTheLevels() {
        ChessBotService bot = seeded(11);

        assertEquals("d1d5", bot.chooseBotMove(at(POISONED_PAWN), 1).toString(),
                "level 1 searches one half-move: it should walk into the recapture");
        assertNotEquals("d1d5", bot.chooseBotMove(at(POISONED_PAWN), 10).toString(),
                "level 10 searches deep enough to leave the pawn alone");
    }

    /**
     * The noise is the level's second knob, and the one that makes the bot feel
     * human: on a quiet position where several moves are close in value, a noisy
     * level wanders while a silent one repeats itself.
     */
    @Test
    @DisplayName("a noisy level varies its move, a silent one does not")
    void noiseSeparatesTheLevels() {
        ChessBotService noisy = seeded(5);
        ChessBotService silent = seeded(5);
        String opening = new Board().getFen();

        long noisyChoices = distinctMovesOver(noisy, opening, 5, 12);
        long silentChoices = distinctMovesOver(silent, opening, 10, 12);

        assertEquals(1, silentChoices, "level 10 has no noise: it must be deterministic");
        assertTrue(noisyChoices > 1,
                "level 5 has ±100 of noise: it should not always answer the same thing");
    }

    private static long distinctMovesOver(ChessBotService bot, String fen, int level, int rounds) {
        return java.util.stream.IntStream.range(0, rounds)
                .mapToObj(round -> bot.chooseBotMove(at(fen), level).toString())
                .distinct()
                .count();
    }

    /**
     * The test that says the ladder is a ladder. Anything else here checks one
     * knob in isolation; this one plays the bots against each other and asks
     * which of them ends up ahead.
     *
     * Material rather than checkmate is the yardstick: a beginner-level bot
     * rarely gets itself mated inside forty half-moves, but it does bleed pieces
     * the whole way through, and that is the same statement made cheaply.
     */
    @Test
    @DisplayName("the strong level ends up ahead of the weak one")
    void higherLevelsAreActuallyStronger() {
        int totalEdge = 0;

        for (int game = 0; game < 3; game++) {
            totalEdge += materialEdgeAfterGame(6, 1, game);
        }

        assertTrue(totalEdge > 0,
                "level 6 finished behind level 1 over three games (edge " + totalEdge + ")");
    }

    /**
     * Plays one bot against another and reports how much material the stronger
     * one is up at the end.
     *
     * @param whiteLevel the level playing White, the one measured
     * @param blackLevel the level playing Black
     * @param seed       fixes the whole game, blunders included
     * @return White's material minus Black's, in centipawns
     */
    private static int materialEdgeAfterGame(int whiteLevel, int blackLevel, long seed) {
        ChessBotService white = seeded(seed);
        ChessBotService black = seeded(seed + 1000);
        Board board = new Board();

        for (int ply = 0; ply < 40; ply++) {
            if (board.legalMoves().isEmpty() || board.isDraw()) {
                break;
            }
            boolean whiteToMove = board.getSideToMove() == Side.WHITE;
            ChessBotService mover = whiteToMove ? white : black;
            board.doMove(mover.chooseBotMove(board, whiteToMove ? whiteLevel : blackLevel));
        }

        return materialOf(board, Side.WHITE) - materialOf(board, Side.BLACK);
    }

    private static int materialOf(Board board, Side side) {
        int total = 0;
        int[] values = { 100, 320, 330, 500, 900 };
        PieceType[] types = { PieceType.PAWN, PieceType.KNIGHT, PieceType.BISHOP,
                PieceType.ROOK, PieceType.QUEEN };

        for (int i = 0; i < types.length; i++) {
            total += Long.bitCount(board.getBitboard(Piece.make(side, types[i]))) * values[i];
        }

        return total;
    }
}
