package com.acme.backend.exception;

/**
 * Exception thrown when a referenced image file cannot be found on the filesystem.
 */
public class ImageFileNotFoundException extends RuntimeException {
    public ImageFileNotFoundException(String message) {
        super(message);
    }

    public ImageFileNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}
