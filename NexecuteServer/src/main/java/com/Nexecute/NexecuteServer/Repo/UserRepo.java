package com.Nexecute.NexecuteServer.Repo;

import com.Nexecute.NexecuteServer.Entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepo extends JpaRepository<Users, UUID> {
    Optional<Users> findByUserName(String userName);

    Optional<Users> findByGitHubId(String githubId);
}
