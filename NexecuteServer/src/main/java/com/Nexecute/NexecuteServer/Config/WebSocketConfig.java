package com.Nexecute.NexecuteServer.Config;

import com.Nexecute.NexecuteServer.Utility.InteractiveExecutionHandler;
import com.Nexecute.NexecuteServer.Utility.JwtHandshakeInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

    private final InteractiveExecutionHandler interactiveExecutionHandler;
    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;
    @org.springframework.beans.factory.annotation.Value("${app.cors.allowed-origins}")
    private String[] allowedOrigins;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(interactiveExecutionHandler,"/ws/execute", "/ws/ide")
                .addInterceptors(jwtHandshakeInterceptor)
                .setAllowedOrigins(allowedOrigins);
    }
}
