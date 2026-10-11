package com.acme.backend.exception;

/**
 * Exception thrown when communication with ML service fails or returns an error.
 */
public class MLServiceException extends RuntimeException {
    public MLServiceException(String message) {
        super(message);
    }

    public MLServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
