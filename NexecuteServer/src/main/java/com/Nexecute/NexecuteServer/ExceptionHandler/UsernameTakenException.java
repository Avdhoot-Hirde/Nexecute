package com.Nexecute.NexecuteServer.ExceptionHandler;

public class UsernameTakenException extends RuntimeException {
    public UsernameTakenException(String message) {
        super(message);
    }
}
