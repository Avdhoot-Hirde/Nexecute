package com.Nexecute.NexecuteServer.Controller;
import com.Nexecute.NexecuteServer.Service.DockerExecutionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.concurrent.RejectedExecutionException;

@RestController
@RequiredArgsConstructor
public class ExecutionController {
    private final DockerExecutionService sandbox;
    private final com.Nexecute.NexecuteServer.Service.CodeService history;
    public record Request(String language, String code, String stdin, String file) {}
    @PostMapping({"/api/trial/execute", "/api/execute"})
    public ResponseEntity<?> execute(@RequestBody Request request, org.springframework.security.core.Authentication authentication) {
        try (var execution = sandbox.prepare(request.language(), request.code(), request.stdin(), request.file(), false, (type, data) -> {})) {
            var result = execution.start().join();
            var body = new java.util.LinkedHashMap<String, Object>();
            body.put("stdout", result.stdout()); body.put("stderr", result.stderr());
            body.put("exitCode", result.exitCode()); body.put("status", result.status());
            if (authentication != null && authentication.getPrincipal() instanceof com.Nexecute.NexecuteServer.Filter.AppUserPrincipal principal) {
                try { body.put("history", history.saveRun(principal.getUser(), request.language(), request.file(), request.code(), result)); }
                catch (RuntimeException e) {
                    body.put("historyError", "The run finished, but its history could not be saved. Please try again later.");
                    org.slf4j.LoggerFactory.getLogger(ExecutionController.class).error("Could not save execution history", e);
                }
            }
            return ResponseEntity.status(result.status().equals("completed") ? 200 : 422).body(body);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("stderr", e.getMessage()));
        } catch (RejectedExecutionException e) {
            return ResponseEntity.status(429).body(Map.of("stderr", e.getMessage()));
        }
    }
}
