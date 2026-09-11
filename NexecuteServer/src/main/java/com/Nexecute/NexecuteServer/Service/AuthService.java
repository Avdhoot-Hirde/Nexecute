package com.Nexecute.NexecuteServer.Service;

import com.Nexecute.NexecuteServer.DTO.SignUpDto;
import com.Nexecute.NexecuteServer.Entity.Users;
import com.Nexecute.NexecuteServer.Repo.UserRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    private final UserRepo userRepo;
    private final PasswordEncoder passwordEncoder;

    public void saveNewUser(SignUpDto signUpDto) {
        if(userRepo.findByUserName(signUpDto.getUserName())!=null){
            log.error("User already exists with username: {}");
            throw new RuntimeException("User already exists");
        }
        if(!signUpDto.getPassword().equals(signUpDto.getConfirmPassword())){
            log.error("Passwords do not match for username: {}");
            throw new RuntimeException("Passwords do not match");
        }
        Users user=Users.builder()
                .userName(signUpDto.getUserName())
                .password(passwordEncoder.encode(signUpDto.getPassword()))
                .email(signUpDto.getEmail())
                .build();
        userRepo.save(user);
        log.info("User signed up successfully with username: {}");
    }
    public Users login(String userName,String password){
        Users user = userRepo.findByUserName(userName);
        if(passwordEncoder.matches(password,user.getPassword())){
            return user;
        }
        return null;
    }
}
