package com.transcendance.backend.chess.application;

import com.github.bhlangonijr.chesslib.Board;

public class ChessGameService {
    
    public void gameEngine(){
        Board chessBoard = new Board();
        chessBoard.loadFromFen("f/e/n");
    }
}
