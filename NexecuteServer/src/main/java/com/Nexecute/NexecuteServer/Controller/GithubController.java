package com.Nexecute.NexecuteServer.Controller;

import com.Nexecute.NexecuteServer.Filter.CurrentUser;
import com.Nexecute.NexecuteServer.Service.GithubPushService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/github")
public class GithubController {
    private final CurrentUser currentUser;
    private final GithubPushService github;
    @PostMapping("/push")
    public ResponseEntity<?> push(@RequestBody GithubPushService.Request request) {
        var user = currentUser.require().getUser();
        try { return ResponseEntity.ok(github.push(user, request)); }
        catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason()));
        }
    }
}
