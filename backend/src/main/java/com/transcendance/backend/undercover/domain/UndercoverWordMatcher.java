package com.transcendance.backend.undercover.domain;

import java.text.Normalizer;
import java.util.Locale;

public class UndercoverWordMatcher {

    /**
     * Reduces a word to the form guesses are compared in.
     *
     * @param word the word as typed, or null when nothing was sent
     * @return lower case, without accents, trimmed and with inner runs of
     *         spaces collapsed to one; an empty string for null
     */
    public String normalize(String word) {
        if (word == null) {
            return "";
        }

        String withoutAccents = Normalizer.normalize(word, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return withoutAccents.toLowerCase(Locale.ROOT).trim().replaceAll("\\s+", " ");
    }

    /**
     * @param guess      what Mr White sent, or null if his time ran out
     * @param agentsWord the word the agents were given
     * @return whether the guess names that word; never true for a blank guess
     */
    public boolean matches(String guess, String agentsWord) {
        String normalizedGuess = normalize(guess);
        if (normalizedGuess.isEmpty()) {
            return false;
        }
        return normalizedGuess.equals(normalize(agentsWord));
    }
}
