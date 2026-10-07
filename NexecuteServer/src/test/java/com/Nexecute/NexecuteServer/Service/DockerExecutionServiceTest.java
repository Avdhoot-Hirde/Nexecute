package com.Nexecute.NexecuteServer.Service;

import org.junit.jupiter.api.Test;
import java.nio.file.Path;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

class DockerExecutionServiceTest {
    @Test void validatesBeforeReservingCapacity() {
        var service = new DockerExecutionService("test");
        try {
            assertThrows(IllegalArgumentException.class, () -> service.prepare("sh", "echo bad", "", false, (t,d) -> {}));
            assertThrows(IllegalArgumentException.class, () -> service.prepare("python", "é".repeat(32769), "", false, (t,d) -> {}));
            assertThrows(IllegalArgumentException.class, () -> service.prepare("python", "print(1)", "x".repeat(65537), false, (t,d) -> {}));
            var runs = new java.util.ArrayList<DockerExecutionService.Execution>();
            for (int i = 0; i < 4; i++) runs.add(service.prepare("python", "print(1)", "", false, (t,d) -> {}));
            assertThrows(RejectedExecutionException.class, () -> service.prepare("python", "print(1)", "", false, (t,d) -> {}));
            runs.forEach(DockerExecutionService.Execution::close);
            runs.forEach(run -> run.start().join());
            var next = service.prepare("java", "class Solution {}", "", false, (t,d) -> {});
            next.close(); next.start().join();
        } finally { service.shutdown(); }
    }
    @Test void createsRestrictedContainerWithFixedSourcePath() {
        var service = new DockerExecutionService("nexecute-sandbox:local");
        try {
            var command = service.createCommand("test", Path.of("source"), "cpp");
            for (String flag : new String[]{"--network=none", "--read-only", "--user=10001:10001", "--cap-drop=ALL",
                    "--security-opt=no-new-privileges", "--memory=256m", "--memory-swap=256m", "--pids-limit=64", "--cpus=1", "--pull=never"})
                assertTrue(command.contains(flag), flag);
            assertTrue(command.stream().anyMatch(arg -> arg.endsWith("target=/source,readonly")));
            assertEquals("Solution.cpp", command.getLast());
        } finally { service.shutdown(); }
    }
    @Test void validatesFrontendFilenames() {
        for (var entry : java.util.Map.of("c", ".c", "go", ".go", "rust", ".rs", "ruby", ".rb", "php", ".php", "typescript", ".ts").entrySet()) {
            assertEquals("Solution" + entry.getValue(), DockerExecutionService.fileName(entry.getKey()));
            assertEquals("Custom" + entry.getValue(), DockerExecutionService.sourceFileName(entry.getKey(), "Custom" + entry.getValue()));
            assertThrows(IllegalArgumentException.class, () -> DockerExecutionService.sourceFileName(entry.getKey(), "Wrong.txt"));
        }
        assertEquals("Main.java", DockerExecutionService.sourceFileName("java", "Main.java"));
        assertEquals("Solution.java", DockerExecutionService.sourceFileName("java", null));
        assertEquals("my-script.py", DockerExecutionService.sourceFileName("python", "my-script.py"));
        for (String file : new String[]{"../Main.java", "a/Main.java", "a\\Main.java", "Main.java;id", "Main.py", "", "CON.java", "My-Class.java", "class.java"})
            assertThrows(IllegalArgumentException.class, () -> DockerExecutionService.sourceFileName("java", file), file);
    }
}
