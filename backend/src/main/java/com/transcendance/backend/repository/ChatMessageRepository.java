package com.transcendance.backend.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.transcendance.backend.model.ChatMessage;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findBySender_IdUserAndReceiver_IdUserOrSender_IdUserAndReceiver_IdUserOrderBySentAtAsc(
            UUID senderId1, UUID receiverId1,
            UUID senderId2, UUID receiverId2
    );
}