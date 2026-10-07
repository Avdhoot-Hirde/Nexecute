package com.Nexecute.NexecuteServer.ExceptionHandler;

public class UnauthorizedExceptions extends RuntimeException {
    public UnauthorizedExceptions(String notAuthenticated)  {
        super(notAuthenticated);
    }
}
