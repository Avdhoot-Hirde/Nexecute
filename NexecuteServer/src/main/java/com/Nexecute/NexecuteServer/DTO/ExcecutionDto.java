package com.Nexecute.NexecuteServer.DTO;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ExcecutionDto {
    private UUID id;
    private String code;
    private String file;
    private String language;
}
