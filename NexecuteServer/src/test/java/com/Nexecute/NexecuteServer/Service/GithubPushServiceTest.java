package com.Nexecute.NexecuteServer.Service;

import com.Nexecute.NexecuteServer.Entity.Users;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.springframework.security.crypto.encrypt.Encryptors;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class GithubPushServiceTest {
    private HttpServer server;
    private GithubPushService service;
    private Users user;
    private final ObjectMapper mapper = new ObjectMapper();
    private final List<String> bodies = new ArrayList<>(), uris = new ArrayList<>(), auth = new ArrayList<>();
    private int lookupStatus = 404, writeStatus = 201;
    @BeforeEach void setup() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/repos/", exchange -> {
            uris.add(exchange.getRequestURI().toASCIIString());
            auth.add(exchange.getRequestHeaders().getFirst("Authorization"));
            boolean get = exchange.getRequestMethod().equals("GET");
            if (!get) bodies.add(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            String response = get ? "{\"type\":\"file\",\"sha\":\"existing-sha\"}"
                    : "{\"content\":{\"html_url\":\"https://github.com/ada/demo/blob/main/Solution.java\"},\"commit\":{\"sha\":\"commit-sha\"}}";
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(get ? lookupStatus : writeStatus, bytes.length);
            exchange.getResponseBody().write(bytes); exchange.close();
        });
        server.start();
        var encryptor = Encryptors.text("test-password", "0123456789abcdef");
        service = new GithubPushService(encryptor, mapper, "http://127.0.0.1:" + server.getAddress().getPort());
        user = Users.builder().gitHubId("123").gitHubAccessToken(encryptor.encrypt("test-token")).build();
    }
    @AfterEach void stop() { server.stop(0); }
    private GithubPushService.Request request(String path) {
        return new GithubPushService.Request("ada/demo", "feature/a+b", path, "Save solution", "print('你好')\n", "python");
    }
    @Test void createsUtf8FileAndEncodesPathAndBranch() {
        var result = service.push(user, request("src/my solution.py"));
        var sent = mapper.readTree(bodies.getFirst());
        assertFalse(sent.has("sha"));
        assertEquals("print('你好')\n", new String(Base64.getDecoder().decode(sent.path("content").asText()), StandardCharsets.UTF_8));
        assertEquals("feature/a+b", sent.path("branch").asText());
        assertEquals("Save solution", sent.path("message").asText());
        assertTrue(uris.getFirst().contains("src/my%20solution.py?ref=feature%2Fa%2Bb"));
        assertEquals(List.of("Bearer test-token", "Bearer test-token"), auth);
        assertEquals("commit-sha", result.commitSha());
    }
    @Test void updatesWithCurrentFileSha() {
        lookupStatus = 200; writeStatus = 200;
        service.push(user, request("Solution.py"));
        assertEquals("existing-sha", mapper.readTree(bodies.getFirst()).path("sha").asText());
    }
    @Test void rejectsUnsafePathsAndDisconnectedAccountsBeforeNetwork() {
        for (String path : List.of("../secret", "/absolute", "a//b", "a/./b", "a\\b"))
            assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.push(user, request(path))).getStatusCode().value());
        user.setGitHubAccessToken(null);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.push(user, request("Solution.py"))).getStatusCode().value());
        assertTrue(uris.isEmpty());
    }
    @Test void reportsConflictWithoutRetryingWrite() {
        lookupStatus = 200; writeStatus = 409;
        var error = assertThrows(ResponseStatusException.class, () -> service.push(user, request("Solution.py")));
        assertEquals(409, error.getStatusCode().value());
        assertEquals(1, bodies.size());
    }
    @Test void refusesWriteWhenAuthorizationFails() {
        lookupStatus = 401;
        var error = assertThrows(ResponseStatusException.class, () -> service.push(user, request("Solution.py")));
        assertTrue(error.getReason().contains("Reconnect"));
        assertTrue(bodies.isEmpty());
    }
}
