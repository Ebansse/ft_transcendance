package com.transcendance.backend.undercover.domain;

import java.time.Duration;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class UndercoverRules {

    public static final int MIN_PLAYERS = 3;

    public static final int DEFAULT_DESCRIPTION_SECONDS = 45;
    public static final int DEFAULT_VOTE_SECONDS = 120;
    public static final int DEFAULT_MRWHITE_VOTE_SECONDS = 60;

    private static final int MIN_PHASE_SECONDS = 15;

    @Column(name = "undercover_count", nullable = false)
    private int undercoverCount;

    @Column(name = "mr_white_count", nullable = false)
    private int mrWhiteCount;

    @Column(name = "description_rounds", nullable = false)
    private int descriptionRounds;

    @Column(name = "max_votes")
    private Integer maxVotes;

    @Column(name = "description_seconds", nullable = false)
    private int descriptionSeconds;

    @Column(name = "vote_seconds", nullable = false)
    private int voteSeconds;

    @Column(name = "mr_white_vote_seconds", nullable = false)
    private int mrWhiteVoteSeconds;

    @Column(name = "undercover_win_on_parity", nullable = false)
    private boolean undercoverWinOnParity;

    @Column(name = "tie_revotes", nullable = false)
    private int tieRevotes;

    @Column(name = "random_on_unresolved_tie", nullable = false)
    private boolean randomOnUnresolvedTie;

    /**
     * The settings a preset mode is played with.
     *
     * @throws UndercoverException.InvalidRules for CUSTOM, which has no preset
     *                                          by definition - its settings come
     *                                          from the player instead
     */
    public static UndercoverRules defaultsFor(UndercoverGameMode mode) {
        return switch (mode) {
            case CLASSIC -> UndercoverRules.builder()
                    .undercoverCount(1)
                    .mrWhiteCount(0)
                    .descriptionRounds(3)
                    .maxVotes(1)
                    .descriptionSeconds(DEFAULT_DESCRIPTION_SECONDS)
                    .voteSeconds(DEFAULT_VOTE_SECONDS)
                    .undercoverWinOnParity(false)
                    .tieRevotes(2)
                    .randomOnUnresolvedTie(false)
                    .mrWhiteVoteSeconds(DEFAULT_MRWHITE_VOTE_SECONDS)
                    .build();
            case BATTLEROYAL -> UndercoverRules.builder()
                    .undercoverCount(1)
                    .mrWhiteCount(0)
                    .descriptionRounds(1)
                    .maxVotes(null)
                    .descriptionSeconds(DEFAULT_DESCRIPTION_SECONDS)
                    .voteSeconds(DEFAULT_VOTE_SECONDS)
                    .undercoverWinOnParity(true)
                    .tieRevotes(1)
                    .randomOnUnresolvedTie(true)
                    .mrWhiteVoteSeconds(DEFAULT_MRWHITE_VOTE_SECONDS)
                    .build();
            case CUSTOM -> throw new UndercoverException.InvalidRules(
                    "Custom matches carry their own rules, there is no preset to fall back on");
        };
    }

    public int agentsCount(int playerCount) {
        return playerCount - impostorsCount();
    }

    public int impostorsCount() {
        return undercoverCount + mrWhiteCount;
    }

    public boolean hasMrWhite() {
        return mrWhiteCount > 0;
    }

    public boolean hasVoteLeft(int votesUsed) {
        return maxVotes == null || votesUsed < maxVotes;
    }

    /**
     * How long the given phase is allowed to last.
     *
     * @return the phase duration, or null for a phase that is not on a clock
     */
    public Duration durationOf(UndercoverPhase phase) {
        return switch (phase) {
            case DESCRIPTION -> Duration.ofSeconds(descriptionSeconds);
            case VOTE -> Duration.ofSeconds(voteSeconds);
            case MR_WHITE_GUESS -> Duration.ofSeconds(mrWhiteVoteSeconds);
            case END -> null;
        };
    }

    /**
     * Refuses settings that cannot produce a playable match.
     *
     * Called when the match is created rather than at the edge of the api, so
     * the presets are held to the same standard as what a player sends in.
     *
     * @param playerCount how many players are about to sit down
     */
    public void validateFor(int playerCount) {
        if (playerCount < MIN_PLAYERS) {
            throw new UndercoverException.InvalidRules(
                    "A match needs at least " + MIN_PLAYERS + " players, got " + playerCount);
        }
        if (undercoverCount < 1) {
            throw new UndercoverException.InvalidRules("A match needs at least one undercover");
        }
        if (mrWhiteCount < 0) {
            throw new UndercoverException.InvalidRules("Mr White count cannot be negative");
        }
        if (descriptionRounds < 1) {
            throw new UndercoverException.InvalidRules(
                    "Players must describe at least once before a vote opens");
        }
        if (maxVotes != null && maxVotes < 1) {
            throw new UndercoverException.InvalidRules(
                    "A match with no vote at all could never be won");
        }

        if (agentsCount(playerCount) < 1) {
            throw new UndercoverException.InvalidRules(
                    "No room left for an agent: " + impostorsCount() + " impostors for "
                            + playerCount + " players");
        }

        if (tieRevotes < 0) {
            throw new UndercoverException.InvalidRules("Tie revotes cannot be negative");
        }

        if (descriptionSeconds < MIN_PHASE_SECONDS || voteSeconds < MIN_PHASE_SECONDS
                || mrWhiteVoteSeconds < MIN_PHASE_SECONDS) {
            throw new UndercoverException.InvalidRules(
                    "Phases must last at least " + MIN_PHASE_SECONDS + " seconds");
        }

        if (maxVotes != null && maxVotes < impostorsCount()) {
            throw new UndercoverException.InvalidRules(
                    "Agents need at least one vote per impostor: " + maxVotes + " votes for " + impostorsCount()
                            + " impostors");
        }
        if (undercoverWinOnParity && agentsCount(playerCount) <= impostorsCount()) {
            throw new UndercoverException.InvalidRules(
                    "Agents must outnumber the impostors at the start: "
                            + agentsCount(playerCount) + " against " + impostorsCount());
        }
    }
}
