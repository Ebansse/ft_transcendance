package com.transcendance.backend.chess.domain;

import org.springframework.stereotype.Component;

import com.github.bhlangonijr.chesslib.Board;
import com.github.bhlangonijr.chesslib.move.Move;

@Component
public class ChessRules {
    
    public boolean isValidMove(Board board,Move move) {
        return board.isMoveLegal(move, true);
    }
}
