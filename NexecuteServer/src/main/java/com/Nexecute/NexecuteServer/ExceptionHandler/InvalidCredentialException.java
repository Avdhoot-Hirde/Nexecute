package com.Nexecute.NexecuteServer.ExceptionHandler;

public class InvalidCredentialException extends RuntimeException {
    public InvalidCredentialException(String message) {
        super(message);
    }
}
