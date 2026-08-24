package com.transcendance.backend.chess.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.transcendance.backend.chess.persistence.entity.ChessMatchEntity;

@Repository
public interface ChessMatchEntityRepository extends JpaRepository<ChessMatchEntity, Long> {
}
