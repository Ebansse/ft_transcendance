package com.transcendance.backend.chess.application;


import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.github.bhlangonijr.chesslib.Board;
import com.transcendance.backend.chess.api.dto.ChessInvitationDto;
import com.transcendance.backend.chess.domain.ChessInvitationState;
import com.transcendance.backend.chess.persistence.entity.ChessMatchEntity;
import com.transcendance.backend.chess.persistence.repository.ChessMatchEntityRepository;
import com.transcendance.backend.model.User;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ChessGameService {

    private final ChessMatchEntityRepository chessMatchRepository;
    private final ChessPlayerService chessPlayerService;

    @Transactional
    public ChessMatchEntity createNewGame(ChessInvitationDto chessInvitation, User opponent) {

        if (chessInvitation.getState() != ChessInvitationState.ACCEPTED) {
            throw new IllegalArgumentException("Cannot create a game from an invitation that is not accepted");
        }
        if(chessInvitation.getFromUserId().equals(opponent.getIdUser())) {
            throw new IllegalArgumentException("Cannot create a game with yourself");
        }
        if (chessMatchRepository.existsActiveMatch(chessInvitation.getFromUserId())) {
            throw new IllegalArgumentException("You already have an active match");
        }
        if (chessMatchRepository.existsActiveMatch(opponent.getIdUser())) {
            throw new IllegalArgumentException("Opponent already has an active match");
        }
        Board chessBoard = new Board();
        ChessMatchEntity chessMatch = new ChessMatchEntity(
                chessBoard,
                chessPlayerService.getOrCreatePlayer(chessInvitation.getFromUserId()),
                chessPlayerService.getOrCreatePlayer(opponent.getIdUser()));

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
