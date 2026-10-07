package com.Nexecute.NexecuteServer.ExceptionHandler;

public class PasswordMismatchException extends RuntimeException {
    public PasswordMismatchException(String message) {
        super(message);
    }
}
