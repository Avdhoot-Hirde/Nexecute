package com.Nexecute.NexecuteServer.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
public class ErrorDto {
    private String message;
    private Instant timestamp = Instant.now();

    public ErrorDto(String message) {
        this.message = message;
    }
}
