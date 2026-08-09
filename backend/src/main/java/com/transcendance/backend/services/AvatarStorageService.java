package com.transcendance.backend.services;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.Set;
import java.util.UUID;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.transcendance.backend.config.AvatarProperties;

@Service
public class AvatarStorageService {

    private static final Set<String> ALLOWED_FORMATS = Set.of("png", "jpeg", "jpg");

    private final AvatarProperties avatarProperties;

    public AvatarStorageService(AvatarProperties avatarProperties) {
        this.avatarProperties = avatarProperties;
    }

    /**
     * Validates and stores the file on disk, returning the generated filename
     * (never the absolute path, never the original filename).
     */
    public String store(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("The file is empty");
        }

        if (file.getSize() > avatarProperties.getMaxSizeBytes()) {
            throw new IllegalArgumentException("The file is too large");
        }

        String extension = detectImageFormat(file);
        String filename = UUID.randomUUID() + "." + extension;

        Path storageDir = Path.of(avatarProperties.getStorageDir());
        try {
            Files.createDirectories(storageDir);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create storage directory", e);
        }

        Path target = storageDir.resolve(filename).normalize();

        // Security: even though we generate the filename ourselves, we double-check
        // the final path stays inside the storage directory (defense in depth).
        if (!target.startsWith(storageDir.normalize())) {
            throw new IllegalStateException("Invalid destination path.");
        }

        try {
            file.transferTo(target);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to store the file.", e);
        }

        return filename;
    }

    /** Deletes an old avatar. Must never make the caller fail if the file is already missing. */
    public void delete(String filename) {
        if (filename == null || filename.isBlank()) return;

        Path target = Path.of(avatarProperties.getStorageDir()).resolve(filename).normalize();
        try {
            // TODO 4: delete the file if it exists (one line, Files.___)
        } catch (IOException e) {
            // TODO 5: log a warning, do NOT rethrow the exception
            // (why? think about it before step 3: where is delete() called from?)
        }
    }

    /**
     * Actually decodes the file to determine its real image format,
     * never trusting the filename extension or the Content-Type declared by the client.
     */
    private String detectImageFormat(MultipartFile file) {
        try (InputStream rawIn = file.getInputStream();
             ImageInputStream iis = ImageIO.createImageInputStream(rawIn)) {

            Iterator<ImageReader> readers = ImageIO.getImageReaders(iis);
            if (!readers.hasNext()) {
                throw new IllegalArgumentException("Le fichier n'est pas une image valide.");
            }

            String format = readers.next().getFormatName().toLowerCase();

            // TODO 6: if `format` is not in ALLOWED_FORMATS, throw IllegalArgumentException
            //         with a clear message (unsupported type)

            return format.equals("jpeg") ? "jpg" : format;

        } catch (IOException e) {
            throw new IllegalArgumentException("Fichier illisible.");
        }
    }
}
