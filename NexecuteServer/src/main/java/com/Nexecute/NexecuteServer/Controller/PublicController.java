package com.Nexecute.NexecuteServer.Controller;

import com.Nexecute.NexecuteServer.DTO.AuthDto;
import com.Nexecute.NexecuteServer.DTO.LoginDto;
import com.Nexecute.NexecuteServer.DTO.SignUpDto;
import com.Nexecute.NexecuteServer.DTO.UserResponseDto;
import com.Nexecute.NexecuteServer.Entity.Users;
import com.Nexecute.NexecuteServer.Filter.AppUserPrincipal;
import com.Nexecute.NexecuteServer.Filter.CurrentUser;
import com.Nexecute.NexecuteServer.Service.AuthService;
import com.Nexecute.NexecuteServer.Utility.JwtUtil;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class PublicController {
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;
    private final JwtUtil jwtUtil;
    private final CurrentUser currentUser;

    @GetMapping
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Server is running");
    }
    @PostMapping("/register")
    public ResponseEntity<Map<String,String>> signUp(@RequestBody SignUpDto signUpDto) {
        authService.saveNewUser(signUpDto);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of("message", "User signed up successfully"));

    }
    @PostMapping("/login")
    public ResponseEntity<AuthDto> login(@RequestBody LoginDto loginDto, HttpServletResponse response) {
        Users user=authService.login(loginDto.getUserName(),loginDto.getPassword());
        String accessTocken=jwtUtil.generateToken(user.getUserName(),15);
        String refreshToken=jwtUtil.generateToken(user.getUserName(),60*24*7);

        ResponseCookie refreshCookie=ResponseCookie.from("refreshToken",refreshToken)
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path("/auth/refresh")
                .maxAge(Duration.ofDays(7))
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE,refreshCookie.toString());
        return ResponseEntity.ok(new AuthDto(accessTocken));

    }

    @GetMapping("/login-url")
    public Map<String,String> loginUrl(){
        return Map.of("url","/oauth2/authorization/github");
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponseDto> me(){
        AppUserPrincipal require = currentUser.require();
        Users user = require.getUser();
        return ResponseEntity.ok(new UserResponseDto(
                user.getId(),
                user.getGitHubId(),
                user.getGitHubUsername()
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthDto> refresh(@CookieValue(value="refreshToken",required = false)String refreshToken){
        if(refreshToken==null || !jwtUtil.validateToken(refreshToken)){
            return ResponseEntity.status(401).build();
        }
        String userName = jwtUtil.extractUserName(refreshToken);
        String newAccessToken = jwtUtil.generateToken(userName, 15);
        return ResponseEntity.ok(new AuthDto(newAccessToken));

    }
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response){
        ResponseCookie deleteCookie=ResponseCookie.from("refreshToken","")
                .httpOnly(true)
                .path("/auth/refresh")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE,deleteCookie.toString());
        return ResponseEntity.ok().build();
    }
}
