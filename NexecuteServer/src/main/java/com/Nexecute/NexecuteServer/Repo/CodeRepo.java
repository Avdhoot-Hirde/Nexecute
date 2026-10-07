package com.Nexecute.NexecuteServer.Repo;

import com.Nexecute.NexecuteServer.Entity.Code;
import com.Nexecute.NexecuteServer.Entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CodeRepo extends JpaRepository<Code, UUID> {
    List<Code> findAllByUserOrderByCreatedAtDesc(Users user);

    Optional<Code> findByIdAndUser(UUID id,Users user);

    void deleteByIdAndUser(UUID id, Users user);
}
