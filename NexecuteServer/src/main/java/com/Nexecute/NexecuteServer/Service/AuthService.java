package com.Nexecute.NexecuteServer.Service;

import com.Nexecute.NexecuteServer.DTO.SignUpDto;
import com.Nexecute.NexecuteServer.Entity.Users;
import com.Nexecute.NexecuteServer.ExceptionHandler.InvalidCredentialException;
import com.Nexecute.NexecuteServer.ExceptionHandler.PasswordMismatchException;
import com.Nexecute.NexecuteServer.ExceptionHandler.UsernameTakenException;
import com.Nexecute.NexecuteServer.Repo.UserRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.encrypt.TextEncryptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.hibernate.type.descriptor.java.CoercionHelper.toLong;


@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    private final UserRepo userRepo;
    private final PasswordEncoder passwordEncoder;
    private final TextEncryptor tokenEncryptor;

    public void saveNewUser(SignUpDto signUpDto) {
        if (!signUpDto.getPassword().equals(signUpDto.getConfirmPassword())) {

            throw new PasswordMismatchException("Passwords do not match");
        }
        if (userRepo.findByUserName(signUpDto.getUserName()).isPresent()) {

            throw new UsernameTakenException("Username already taken");
        }
        Users user = Users.builder()
                .userName(signUpDto.getUserName())
                .password(passwordEncoder.encode(signUpDto.getPassword()))
                .email(signUpDto.getEmail())
                .createdAt(Instant.now())
                .build();
        userRepo.save(user);
        log.info("User signed up successfully with username: {}", signUpDto.getUserName());
    }

    @Transactional
    public Users login(String userName,String password){
        Users user = userRepo.findByUserName(userName).orElseThrow(()-> new InvalidCredentialException("Username or password is wrong"));
        if(user==null){
            throw new InvalidCredentialException("Invalid username or password");
        }
        if(!passwordEncoder.matches(password,user.getPassword())){
            throw new InvalidCredentialException("Invalid username or password");
        }
        user.setLastLoginAt(Instant.now());


        return userRepo.save(user);
    }

    public Users upsertGithub(Map<String, Object> attributes, String accessToken,String scope) {
        String githubId= String.valueOf(attributes.get("id"));
        String login=String.valueOf(attributes.get("login"));
        String encryptedToken=tokenEncryptor.encrypt(accessToken);
        String email = fetchPrimaryVerifiedEmail(accessToken);
        Users user = userRepo.findByGitHubId(githubId).orElseGet(() -> {
            Users newUser = new Users();
            newUser.setCreatedAt(Instant.now());
            newUser.setEmailVerified(true);
            return newUser;
        });
        user.setGitHubId(githubId);
        user.setGitHubAccessToken(encryptedToken);
        user.setGitHubUsername(login);
        user.setTokenScope(scope);
        user.setEmail(email);
        user.setUserName(login);
        return userRepo.save(user);
    }
    private String fetchPrimaryVerifiedEmail(String accessToken) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        try {
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    "https://api.github.com/user/emails",
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    new ParameterizedTypeReference<>() {}
            );

            return response.getBody().stream()
                    .filter(e -> Boolean.TRUE.equals(e.get("primary")) && Boolean.TRUE.equals(e.get("verified")))
                    .map(e -> (String) e.get("email"))
                    .findFirst()
                    .orElse(null);
        } catch (Exception e) {
            return null; // no verified email available — fine, email stays nullable
        }
    }
}
