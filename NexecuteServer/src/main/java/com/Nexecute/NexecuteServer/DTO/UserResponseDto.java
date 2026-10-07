package com.Nexecute.NexecuteServer.DTO;

import java.util.UUID;

public record UserResponseDto(
        UUID id,
        String gitHubId,
        String gitHubUsername
) {}
