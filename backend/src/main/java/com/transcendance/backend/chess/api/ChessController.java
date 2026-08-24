package com.transcendance.backend.chess.api;

import java.security.Principal;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RequestMapping("/api/chess")
@RestController
public class ChessController {

    @PostMapping("/new-game")
    public void createNewGame(Principal principal) {
        // TODO
    }
}
