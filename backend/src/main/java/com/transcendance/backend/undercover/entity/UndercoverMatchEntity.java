package com.transcendance.backend.undercover.entity;

import java.util.List;

import com.transcendance.backend.undercover.domain.UndercoverMatchStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@AllArgsConstructor
@Setter
@Getter
@Entity
@Table(name = "undercover_match")
public class UndercoverMatchEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "undercover_match_id")
    long undercoverMatchId;

    @Column(name = "players")
    List<UndercoverPlayerEntity> players;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    UndercoverMatchStatus status = UndercoverMatchStatus.IN_PROGRESS;

    @Column(name = "undercover_word")
    String undercoverWord;

    @Column(name = "agents_word")
    String agentsWord;
}
