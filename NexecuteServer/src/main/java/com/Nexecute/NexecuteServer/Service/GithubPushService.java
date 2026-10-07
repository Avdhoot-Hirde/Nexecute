package com.Nexecute.NexecuteServer.Service;

import com.Nexecute.NexecuteServer.Entity.Users;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.encrypt.TextEncryptor;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

@Service
public class GithubPushService {
    private final TextEncryptor encryptor;
    private final ObjectMapper mapper;
    private final String baseUrl;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NEVER).build();

    public GithubPushService(TextEncryptor encryptor, ObjectMapper mapper,
            @Value("${app.github.api-base-url:https://api.github.com}") String baseUrl) {
        this.encryptor = encryptor; this.mapper = mapper; this.baseUrl = baseUrl;
    }
    public record Request(String repository, String branch, String path, String message, String content, String language) {}
    public record Result(String htmlUrl, String commitSha, String path, String branch) {}

    public Result push(Users user, Request request) {
        String repository = required(request.repository(), "Repository", 200);
        if (!repository.matches("[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+") || repository.endsWith("/.") || repository.endsWith("/.."))
            throw bad("Enter a repository as owner/repository.");
        String path = required(request.path(), "File path", 1024);
        if (path.contains("\\") || Arrays.stream(path.split("/", -1)).anyMatch(s -> s.isEmpty() || s.equals(".") || s.equals("..")))
            throw bad("Use a relative file path such as src/Solution.java without dot segments.");
        String branch = required(request.branch(), "Branch", 255);
        String message = required(request.message(), "Commit message", 2000);
        if (request.content() == null || request.content().getBytes(StandardCharsets.UTF_8).length > 1048576)
            throw bad("File content is required and must not exceed 1 MiB.");
        if (user.getGitHubId() == null || user.getGitHubAccessToken() == null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Connect your GitHub account before pushing.");
        String token;
        try { token = encryptor.decrypt(user.getGitHubAccessToken()); }
        catch (RuntimeException e) { throw new ResponseStatusException(HttpStatus.CONFLICT, "Reconnect GitHub to refresh your stored credentials."); }
        if (token == null || token.isBlank()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Reconnect your GitHub account.");

        String[] repo = repository.split("/");
        var uri = UriComponentsBuilder.fromUriString(baseUrl).pathSegment("repos", repo[0], repo[1], "contents")
                .pathSegment(path.split("/"));
        URI fileUri = uri.build().encode().toUri();
        // URI template encoding keeps branch names containing '+' or '/' intact.
        URI lookupUri = uri.queryParam("ref", "{branch}").encode().buildAndExpand(branch).toUri();
        var lookup = send("GET", lookupUri, token, null);
        var body = new LinkedHashMap<String, Object>();
        body.put("message", message); body.put("branch", branch);
        body.put("content", Base64.getEncoder().encodeToString(request.content().getBytes(StandardCharsets.UTF_8)));
        if (lookup.statusCode() == 200) {
            JsonNode existing = parse(lookup.body());
            if (!existing.path("type").asText().equals("file") || existing.path("sha").asText().isBlank())
                throw bad("The selected path is not a regular file.");
            body.put("sha", existing.path("sha").asText());
        } else if (lookup.statusCode() != 404) { throw upstream(lookup.statusCode()); }
        var written = send("PUT", fileUri, token, mapper.writeValueAsString(body));
        if (written.statusCode() != 200 && written.statusCode() != 201) throw upstream(written.statusCode());
        JsonNode result = parse(written.body());
        return new Result(result.path("content").path("html_url").asText(), result.path("commit").path("sha").asText(), path, branch);
    }
    private HttpResponse<String> send(String method, URI uri, String token, String body) {
        var request = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(20))
                .header("Authorization", "Bearer " + token).header("Accept", "application/vnd.github+json")
                .header("X-GitHub-Api-Version", "2022-11-28").header("User-Agent", "NexecuteServer")
                .header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body)).build();
        try { return client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "GitHub request interrupted. Check the repository before retrying."); }
        catch (java.io.IOException e) { throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "GitHub could not be reached. Check the repository before retrying."); }
    }
    private JsonNode parse(String body) {
        try { return mapper.readTree(body); }
        catch (RuntimeException e) { throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "GitHub returned an invalid response."); }
    }
    private static String required(String value, String name, int max) {
        if (value == null || value.isBlank() || value.length() > max || value.chars().anyMatch(Character::isISOControl))
            throw bad(name + " is missing or invalid.");
        return value.trim();
    }
    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private static ResponseStatusException upstream(int status) {
        return switch (status) {
            case 401 -> new ResponseStatusException(HttpStatus.CONFLICT, "GitHub authorization expired. Reconnect GitHub.");
            case 403, 429 -> new ResponseStatusException(HttpStatus.FORBIDDEN, "GitHub denied the push. Check repository write access, branch protection, or API rate limits.");
            case 404 -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Repository or branch not found, or your GitHub account cannot access it.");
            case 409 -> new ResponseStatusException(HttpStatus.CONFLICT, "The file changed on GitHub. Review it before retrying the push.");
            case 422 -> bad("GitHub rejected this commit. Check the branch, file path, and repository rules.");
            default -> new ResponseStatusException(HttpStatus.BAD_GATEWAY, "GitHub could not complete the push. Check the repository before retrying.");
        };
    }
}
