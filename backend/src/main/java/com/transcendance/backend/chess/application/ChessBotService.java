package com.transcendance.backend.chess.application;

import java.util.List;
import java.util.Random;

import org.springframework.stereotype.Service;

import com.github.bhlangonijr.chesslib.Board;
import com.github.bhlangonijr.chesslib.move.Move;

@Service
public class ChessBotService {
    private final Random random = new Random();

    public Move chooseBotMove(Board board, int level) {
        List<Move> moves = board.legalMoves();
        return moves.get(random.nextInt(moves.size()));
    }
}
