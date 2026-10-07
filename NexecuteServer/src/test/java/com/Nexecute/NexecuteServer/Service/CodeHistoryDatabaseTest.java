package com.Nexecute.NexecuteServer.Service;

import com.Nexecute.NexecuteServer.Entity.*;
import com.Nexecute.NexecuteServer.Repo.*;
import com.Nexecute.NexecuteServer.ExceptionHandler.CodeNotFountException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import jakarta.persistence.EntityManager;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(properties = {"spring.jpa.hibernate.ddl-auto=create-drop"})
@Import(CodeService.class)
class CodeHistoryDatabaseTest {
    @Autowired CodeService history;
    @Autowired UserRepo users;
    @Autowired EntityManager entityManager;

    @Test void savesReloadsAndIsolatesUsers() {
        var ada = users.save(Users.builder().userName("ada").email("ada@example.test").build());
        var grace = users.save(Users.builder().userName("grace").email("grace@example.test").build());
        var first = history.saveRun(ada, "java", "Numbers.java", "class Numbers {}", new DockerExecutionService.Result("", "", 0, "completed"));
        var failed = history.saveRun("ada", "python", "custom.py", "raise Exception()", new DockerExecutionService.Result("", "failed", 1, "error"));
        history.saveRun(grace, "go", "main.go", "package main", new DockerExecutionService.Result("", "", 0, "completed"));
        entityManager.flush(); entityManager.clear();
        var entries = history.getAllByUser(ada);
        assertEquals(2, entries.size());
        assertEquals(failed.getId(), entries.getFirst().getId());
        assertEquals("error", entries.getFirst().getStatus());
        var restored = history.getCodeById(first.getId(), ada);
        assertEquals("Numbers.java", restored.getFileName());
        assertEquals("class Numbers {}", restored.getCode());
        assertEquals("java", restored.getLanguage());
        assertNotNull(restored.getCreatedAt());
        assertEquals(1, history.getAllByUser(grace).size());
        assertThrows(CodeNotFountException.class, () -> history.getCodeById(first.getId(), grace));
    }
}
