package com.transcendance.backend.undercover.api.dto;

import com.transcendance.backend.undercover.domain.UndercoverGameMode;

/**
 * Request bodies of the undercover api. Checked by the services, which refuse
 * a missing or blank value with a message the client can show.
 */
public final class UndercoverRequests {

    private UndercoverRequests() {
    }

    public record JoinRoom(String code) {
    }

    /**
     * @param rules only read for CUSTOM
     */
    public record ConfigureRoom(UndercoverGameMode mode, UndercoverRulesDto rules) {
    }

    public record SubmitClue(String word) {
    }

    public record SubmitVote(Integer targetSeat) {
    }

    public record SubmitGuess(String guess) {
    }

    public record SendChat(String text) {
    }
}
