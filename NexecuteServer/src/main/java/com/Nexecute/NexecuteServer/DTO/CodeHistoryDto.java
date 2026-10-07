package com.Nexecute.NexecuteServer.DTO;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CodeHistoryDto {
    private UUID id;
    private String fileName;
    private String code;
    private String language;
    private String status;
    private Integer exitCode;
    private Instant createdAt;
    private Instant lastEdit;
}
