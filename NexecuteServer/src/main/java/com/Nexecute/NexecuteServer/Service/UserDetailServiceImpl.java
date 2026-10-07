package com.Nexecute.NexecuteServer.Service;

import com.Nexecute.NexecuteServer.Entity.Users;
import com.Nexecute.NexecuteServer.Filter.AppUserPrincipal;
import com.Nexecute.NexecuteServer.Repo.UserRepo;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class UserDetailServiceImpl implements UserDetailsService {
    private UserRepo userRepo;
    private UserDetailServiceImpl(UserRepo userRepo) {
        this.userRepo = userRepo;
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        Users user = userRepo.findByUserName(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
        return new AppUserPrincipal(user, Map.of());
    }
}
