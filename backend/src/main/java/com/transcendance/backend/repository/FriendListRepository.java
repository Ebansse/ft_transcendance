package com.transcendance.backend.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transcendance.backend.model.FriendList;

public interface FriendListRepository extends JpaRepository<FriendList, Long> {
    
    Optional<FriendList> findByUserId1AndUserId2(UUID userId1, UUID userId2);
}
