package com.transcendance.backend.services;

import java.util.UUID;

import org.springframework.stereotype.Service;

import com.transcendance.backend.dto.ChatMessageDto;
import com.transcendance.backend.dto.ChatMessageRequestDto;
import com.transcendance.backend.model.ChatMessage;
import com.transcendance.backend.model.User;
import com.transcendance.backend.repository.ChatMessageRepository;

import jakarta.transaction.Transactional;

@Service
public class ChatService {

    private static final org.apache.logging.log4j.Logger log = org.apache.logging.log4j.LogManager
            .getLogger(ChatService.class);

    private final UserService userService;
    private final FriendListService friendListService;
    private final ChatMessageRepository chatMessageRepository;

    public ChatService(UserService userService, FriendListService friendListService,
            ChatMessageRepository chatMessageRepository) {
        this.userService = userService;
        this.friendListService = friendListService;
        this.chatMessageRepository = chatMessageRepository;
    }

    /**
     * Persists an incoming chat message, then pushes it to both participants.
     *
     * The sender comes from the Principal established during the WebSocket
     * handshake, never from the payload: a client must not be able to send a
     * message on someone else's behalf.
     * 
     * @param senderId the UUID of the sender, extracted from the Principal
     * @param message  the chat message request DTO containing the content and
     *                 receiver ID
     * @return a ChatMessageDto representing the saved message
     * @throws IllegalArgumentException if the sender or receiver is not found, or
     *                                  if
     *                                  they are not friends
     */
    @Transactional
    public ChatMessageDto sendMessage(UUID senderId, ChatMessageRequestDto message) {
        User sender = userService.getUserById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Sender not found"));
        User receiver = userService.getUserById(message.getReceiverId())
                .orElseThrow(() -> new IllegalArgumentException("Receiver not found"));
        if (!friendListService.checkFriendship(sender, receiver)) {
            log.warn("Users {} and {} are not friends. Message not sent.", sender.getUserName(),
                    receiver.getUserName());
            throw new IllegalArgumentException("Users are not friends");
        }
        ChatMessage chatMessage = new ChatMessage(message.getContent(), sender, receiver);
        chatMessageRepository.save(chatMessage);
        log.info("Message sent from {} to {}: {} chars", sender.getUserName(), receiver.getUserName(),
                message.getContent().length());
        return new ChatMessageDto(chatMessage.getId(), chatMessage.getSender().getIdUser(),
                chatMessage.getReceiver().getIdUser(), chatMessage.getContent(),
                chatMessage.getSentAt(), chatMessage.isRead());
    }
}
