package com.Nexecute.NexecuteServer.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@RequiredArgsConstructor
public class LoginDto {
    @NotBlank(message="Username is required")
    private String userName;
    @NotBlank(message="Password is required")
    private String password;
}
