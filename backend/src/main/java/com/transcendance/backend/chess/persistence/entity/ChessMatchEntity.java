package com.transcendance.backend.chess.persistence.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

import com.github.bhlangonijr.chesslib.Board;
import com.transcendance.backend.chess.domain.ChessMatchStatus;
import com.transcendance.backend.chess.domain.ChessSide;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "chess_matches")
public class ChessMatchEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "chess_match_id")
    private Long chessMatchId;

    @NotBlank
    @Column(name = "fen", nullable = false)
    private String fen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "white_player_id")
    private ChessPlayerEntity whitePlayer;

    @Column(name = "white_bot_level")
    private Integer whiteBotLevel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "black_player_id")
    private ChessPlayerEntity blackPlayer;

    @Column(name = "black_bot_level")
    private Integer blackBotLevel;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ChessMatchStatus status = ChessMatchStatus.IN_PROGRESS;

    @Enumerated(EnumType.STRING)
    @Column(name = "winner_side")
    private ChessSide winnerSide;

    @Version
    @Column(name = "version")
    private Long version;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public ChessMatchEntity(Board board, ChessPlayerEntity whitePlayer, ChessPlayerEntity blackPlayer) {
        this.fen = board.getFen();
        this.whitePlayer = whitePlayer;
        this.blackPlayer = blackPlayer;
        this.status = ChessMatchStatus.IN_PROGRESS;
    }

    public boolean isWhiteBot() {
        return whitePlayer == null;
    }

    public boolean isBlackBot() {
        return blackPlayer == null;
    }

    public UUID getWhitePlayerId() {
        return identifierOf(whitePlayer);
    }

    public UUID getBlackPlayerId() {
        return identifierOf(blackPlayer);
    }

    /**
     * The user id on the other side of the board.
     *
     * @param userId one of the two players
     * @return the opponent's user id, or null when that side is held by a bot
     */
    public UUID opponentOf(UUID userId) {
        return userId.equals(getWhitePlayerId()) ? getBlackPlayerId() : getWhitePlayerId();
    }

    public ChessPlayerEntity playerOn(ChessSide side) {
        return side == ChessSide.WHITE ? whitePlayer : blackPlayer;
    }

    public Board toBoard() {
        Board board = new Board();
        board.loadFromFen(this.fen);
        return board;
    }

    private static UUID identifierOf(ChessPlayerEntity player) {
        return player == null ? null : player.getUserId();
    }
}
