package com.Nexecute.NexecuteServer.DTO;

import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@RequiredArgsConstructor
public class SignUpDto {
    private String userName;
    private String password;
    private String confirmPassword;
    private String email;

}
