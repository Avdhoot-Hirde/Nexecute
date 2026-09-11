package com.Nexecute.NexecuteServer.Repo;

import com.Nexecute.NexecuteServer.Entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserRepo extends JpaRepository<Users, UUID> {
    Users findByUserName(String userName);
}
