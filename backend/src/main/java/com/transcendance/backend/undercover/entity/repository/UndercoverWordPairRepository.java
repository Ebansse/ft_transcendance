package com.transcendance.backend.undercover.entity.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.transcendance.backend.undercover.entity.UndercoverWordPairEntity;

@Repository
public interface UndercoverWordPairRepository extends JpaRepository<UndercoverWordPairEntity, Long> {

    /**
     * One pair drawn at random.
     *
     * Native, since JPQL has neither random() nor LIMIT - which also means
     * nothing checks this query at startup: a wrong table name only surfaces
     * on the first call.
     *
     * @return empty when no pair was seeded
     */
    @Query(value = "SELECT * FROM undercover_word_pair ORDER BY random() LIMIT 1", nativeQuery = true)
    Optional<UndercoverWordPairEntity> findRandomWordPair();

}
