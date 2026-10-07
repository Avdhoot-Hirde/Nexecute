package com.Nexecute.NexecuteServer.Utility;

import com.Nexecute.NexecuteServer.Service.DockerExecutionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import tools.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class InteractiveExecutionHandler extends TextWebSocketHandler {
    private final DockerExecutionService sandbox;
    private final ObjectMapper objectMapper;
    private final com.Nexecute.NexecuteServer.Service.CodeService history;
    private final Map<String, DockerExecutionService.Execution> executions = new ConcurrentHashMap<>();
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    public record Message(String type, String language, String code, String stdin, String data, String file) {}

    @Override public void afterConnectionEstablished(WebSocketSession session) {
        session.setTextMessageSizeLimit(524288);
        sessions.put(session.getId(), new ConcurrentWebSocketSessionDecorator(session, 5000, 524288));
    }
    @Override protected void handleTextMessage(WebSocketSession session, TextMessage text) {
        try {
            Message message = objectMapper.readValue(text.getPayload(), Message.class);
            if (message == null || message.type() == null) throw new IllegalArgumentException("Message type is required.");
            switch (message.type()) {
                case "execute" -> {
                    if (executions.containsKey(session.getId())) {
                        send(session, Map.of("type", "stderr", "data", "An execution is already running.\n"));
                        return;
                    }
                    var execution = sandbox.prepare(message.language(), message.code(), message.stdin(), message.file(), true,
                            (type, data) -> send(session, Map.of("type", type, "data", data)));
                    executions.put(session.getId(), execution);
                    if (!session.isOpen()) execution.close();
                    send(session, Map.of("type", "status", "status", "running"));
                    execution.start().thenAccept(result -> {
                        try {
                            var saved = history.saveRun((String) session.getAttributes().get("userName"),
                                    message.language(), message.file(), message.code(), result);
                            send(session, Map.of("type", "history", "entry", saved));
                        } catch (RuntimeException e) {
                            org.slf4j.LoggerFactory.getLogger(InteractiveExecutionHandler.class).error("Could not save execution history", e);
                            send(session, Map.of("type", "history_error", "data", "The run finished, but its history could not be saved."));
                        }
                        executions.remove(session.getId(), execution);
                        send(session, Map.of("type", "status", "status", result.status(), "exitCode", result.exitCode()));
                    });
                }
                case "stdin" -> {
                    var execution = executions.get(session.getId());
                    if (execution == null) throw new IllegalArgumentException("No execution is running.");
                    execution.input(message.data());
                }
                case "analyze" -> send(session, Map.of("type", "assistant", "data", "AI analysis is not configured on this server."));
                default -> throw new IllegalArgumentException("Unsupported message type.");
            }
        } catch (Exception e) {
            send(session, Map.of("type", "stderr", "data", e instanceof IllegalArgumentException || e instanceof java.util.concurrent.RejectedExecutionException
                    ? e.getMessage() + "\n" : "Invalid execution message.\n"));
            if (!executions.containsKey(session.getId())) send(session, Map.of("type", "status", "status", "error"));
        }
    }
    private void send(WebSocketSession original, Map<String, ?> payload) {
        WebSocketSession session = sessions.get(original.getId());
        if (session == null || !session.isOpen()) return;
        try { session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload))); }
        catch (Exception e) { cleanup(original); }
    }
    private void cleanup(WebSocketSession session) {
        sessions.remove(session.getId());
        var execution = executions.remove(session.getId());
        if (execution != null) execution.close();
    }
    @Override public void afterConnectionClosed(WebSocketSession session, CloseStatus status) { cleanup(session); }
    @Override public void handleTransportError(WebSocketSession session, Throwable exception) { cleanup(session); }
}
