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

    @Transactional
    public ChessMatchEntity createNewGame(UUID whiteUserId, UUID blackUserId) {
        Board chessBoard = new Board();
        ChessMatchEntity chessMatch = new ChessMatchEntity(
                chessBoard,
                chessPlayerService.getOrCreatePlayer(whiteUserId),
                chessPlayerService.getOrCreatePlayer(blackUserId));

        return chessMatchRepository.save(chessMatch);
    }

    /* @Transactional
    public ChessMatchEntity createNewGameAgainstBot(UUID whiteUserId, UUID blackUserId, int botLevel) {
        Board chessBoard = new Board();
        ChessMatchEntity chessMatch = new ChessMatchEntity(
                chessBoard,
                chessPlayerService.getOrCreatePlayer(whiteUserId),
                null);
        chessMatch.setBlackBotLevel(botLevel);

        return chessMatchRepository.save(chessMatch);
    } */
}
