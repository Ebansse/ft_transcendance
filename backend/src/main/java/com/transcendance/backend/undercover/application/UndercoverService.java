package com.transcendance.backend.undercover.application;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.transcendance.backend.undercover.domain.UndercoverException;
import com.transcendance.backend.undercover.domain.UndercoverGameMode;
import com.transcendance.backend.undercover.domain.UndercoverPhase;
import com.transcendance.backend.undercover.domain.UndercoverRoleDealer;
import com.transcendance.backend.undercover.domain.UndercoverRoleDealer.SeatAssignment;
import com.transcendance.backend.undercover.domain.UndercoverRules;
import com.transcendance.backend.undercover.domain.UndercoverTurnOrder;
import com.transcendance.backend.undercover.entity.UndercoverMatchEntity;
import com.transcendance.backend.undercover.entity.UndercoverParticipantEntity;
import com.transcendance.backend.undercover.entity.UndercoverPlayerEntity;
import com.transcendance.backend.undercover.entity.UndercoverWordPairEntity;
import com.transcendance.backend.undercover.entity.repository.UndercoverMatchRepository;
import com.transcendance.backend.undercover.entity.repository.UndercoverPlayerRepository;
import com.transcendance.backend.undercover.entity.repository.UndercoverWordPairRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UndercoverService {

    private final UndercoverMatchRepository matchRepository;
    private final UndercoverPlayerRepository playerRepository;
    private final UndercoverWordPairRepository wordPairRepository;
    private final UndercoverRoleDealer dealer;
    private final UndercoverTurnOrder turnOrder;
    private final Clock clock;

    /**
     * Seats the players, deals the roles and the words, and opens the first
     * description phase.
     *
     * Does not tell anyone their word: that is for the player channel, once
     * the match is saved.
     *
     * @param userIds     the players to seat, in any order - seats are drawn
     * @param mode        the mode the match is labelled with
     * @param customRules the rules to play by for CUSTOM; ignored otherwise,
     *                    since a preset mode brings its own
     * @return the saved match, participants included
     * @throws UndercoverException.InvalidRules    CUSTOM without rules, or rules
     *                                             that cannot seat these players
     * @throws UndercoverException.DuplicatePlayer the same player listed twice
     * @throws UndercoverException.AlreadyInMatch  a player still has a match in
     *                                             progress
     * @throws UndercoverException.NoWordPair      no word pair was seeded
     */
    @Transactional
    public UndercoverMatchEntity createMatch(List<UUID> userIds, UndercoverGameMode mode, UndercoverRules customRules) {
        UndercoverRules rules = rulesFor(mode, customRules);

        for (UUID userId : userIds) {
            if (matchRepository.existsActiveMatch(userId)) {
                throw new UndercoverException.AlreadyInMatch(userId);
            }
        }

        UndercoverWordPairEntity wordPair = wordPairRepository.findRandomWordPair()
                .orElseThrow(UndercoverException.NoWordPair::new);

        List<SeatAssignment> assignments = dealer.dealAssignment(userIds, rules);

        UndercoverMatchEntity match = new UndercoverMatchEntity();
        match.setGameMode(mode);
        match.setRules(rules);
        match.setAgentsWord(wordPair.getAgentsWord());
        match.setUndercoverWord(wordPair.getUndercoverWord());

        Map<UUID, UndercoverPlayerEntity> players = getOrCreatePlayers(userIds);

        for (SeatAssignment assignment : assignments) {
            UndercoverParticipantEntity participant = new UndercoverParticipantEntity();
            participant.setMatch(match);
            participant.setPlayer(players.get(assignment.userId()));
            participant.setRole(assignment.role());
            participant.setSeatOrder(assignment.seatOrder());
            match.getParticipants().add(participant);
        }

        List<Integer> seats = assignments.stream().map(SeatAssignment::seatOrder).toList();
        match.setCurrentSpeakerSeat(turnOrder.firstSpeaker(seats)
                .orElseThrow(() -> new IllegalStateException("A dealt table has no seat")));

        Instant now = clock.instant();
        match.startPhase(UndercoverPhase.DESCRIPTION, now.plus(rules.durationOf(UndercoverPhase.DESCRIPTION)));

        return matchRepository.save(match);
    }

    /**
     * Returns the rules for the given mode and custom rules.
     *
     * @param mode        the mode of the game
     * @param customRules the custom rules, if applicable
     * @return the rules for the game
     */
    private UndercoverRules rulesFor(UndercoverGameMode mode, UndercoverRules customRules) {
        if (mode != UndercoverGameMode.CUSTOM) {
            return UndercoverRules.defaultsFor(mode);
        }
        if (customRules == null) {
            throw new UndercoverException.InvalidRules("A custom match needs its rules");
        }
        return customRules;
    }

    /**
     * The player rows of these users, created for those who never played.
     *
     * Read in one query rather than one per player.
     */
    private Map<UUID, UndercoverPlayerEntity> getOrCreatePlayers(List<UUID> userIds) {
        Map<UUID, UndercoverPlayerEntity> players = new HashMap<>(playerRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(UndercoverPlayerEntity::getUserId, Function.identity())));

        for (UUID userId : userIds) {
            if (!players.containsKey(userId)) {
                UndercoverPlayerEntity player = new UndercoverPlayerEntity();
                player.setUserId(userId);
                players.put(userId, playerRepository.save(player));
            }
        }
        return players;
    }
}
