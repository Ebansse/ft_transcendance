package com.transcendance.backend.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;
import com.transcendance.backend.model.User;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    
    // Method to find a user by email
    Optional<User> findByEmail(String email);

    Optional<User> findByUserName(String userName);

    // Sans charger l'entite : reste fiable meme si des doublons existent deja
    boolean existsByUserName(String userName);
}
