package com.transcendance.backend.undercover.entity.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transcendance.backend.undercover.entity.UndercoverParticipantEntity;

public interface UndercoverParticipantRepository extends JpaRepository<UndercoverParticipantEntity, Long>{
    
}
