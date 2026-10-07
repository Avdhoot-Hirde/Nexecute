package com.Nexecute.NexecuteServer.Utility;

import com.Nexecute.NexecuteServer.Service.DockerExecutionService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.*;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class ExecutionProtocolTest {
    @Test void handshakeAcceptsValidTokenAndRejectsInvalidToken() throws Exception {
        var jwt = mock(JwtUtil.class);
        var interceptor = new JwtHandshakeInterceptor(jwt);
        var request = new MockHttpServletRequest();
        request.setParameter("token", "valid");
        when(jwt.validateToken("valid")).thenReturn(true);
        when(jwt.extractUserName("valid")).thenReturn("Ada");
        var attributes = new HashMap<String, Object>();
        assertTrue(interceptor.beforeHandshake(new ServletServerHttpRequest(request), mock(ServerHttpResponse.class), mock(WebSocketHandler.class), attributes));
        assertEquals("Ada", attributes.get("userName"));
        request.setParameter("token", "bad");
        assertFalse(interceptor.beforeHandshake(new ServletServerHttpRequest(request), mock(ServerHttpResponse.class), mock(WebSocketHandler.class), attributes));
        request.removeParameter("token");
        assertFalse(interceptor.beforeHandshake(new ServletServerHttpRequest(request), mock(ServerHttpResponse.class), mock(WebSocketHandler.class), attributes));
    }
    @Test void routesBlankInputReportsCompletionAndCleansUpDisconnect() throws Exception {
        var service = mock(DockerExecutionService.class);
        var run = mock(DockerExecutionService.Execution.class);
        var future = new CompletableFuture<DockerExecutionService.Result>();
        when(run.start()).thenReturn(future);
        when(service.prepare(eq("python"), eq("print(input())"), eq(""), isNull(), eq(true), any())).thenReturn(run);
        var history = mock(com.Nexecute.NexecuteServer.Service.CodeService.class);
        when(history.saveRun(any(String.class), any(), any(), any(), any())).thenReturn(com.Nexecute.NexecuteServer.DTO.CodeHistoryDto.builder().id(UUID.randomUUID()).build());
        var handler = new InteractiveExecutionHandler(service, new ObjectMapper(), history);
        var session = mock(WebSocketSession.class);
        when(session.getId()).thenReturn("session"); when(session.isOpen()).thenReturn(true);
        when(session.getAttributes()).thenReturn(Map.of("userName", "Ada"));
        var messages = new ArrayList<String>();
        doAnswer(call -> { messages.add(((TextMessage) call.getArgument(0)).getPayload()); return null; }).when(session).sendMessage(any());
        handler.afterConnectionEstablished(session);
        var execute = new TextMessage("{\"type\":\"execute\",\"language\":\"python\",\"code\":\"print(input())\",\"stdin\":\"\"}");
        handler.handleTextMessage(session, execute);
        handler.handleTextMessage(session, new TextMessage("{\"type\":\"stdin\",\"data\":\"\"}"));
        verify(run).input("");
        handler.handleTextMessage(session, execute);
        verify(service, times(1)).prepare(any(), any(), any(), isNull(), eq(true), any());
        future.complete(new DockerExecutionService.Result("", "", 0, "completed"));
        assertTrue(messages.stream().anyMatch(m -> m.contains("completed")));
        verify(history).saveRun(eq("Ada"), eq("python"), isNull(), eq("print(input())"), any());
        assertTrue(messages.stream().anyMatch(m -> m.contains("\"type\":\"history\"")));
        var disconnectedRun = new CompletableFuture<DockerExecutionService.Result>();
        when(run.start()).thenReturn(disconnectedRun);
        handler.handleTextMessage(session, execute);
        handler.afterConnectionClosed(session, CloseStatus.NORMAL);
        verify(run).close();
        disconnectedRun.complete(new DockerExecutionService.Result("", "cancelled", -1, "error"));
        verify(history, times(2)).saveRun(eq("Ada"), eq("python"), isNull(), eq("print(input())"), any());
    }
}
