package com.Nexecute.NexecuteServer.Service;

import com.Nexecute.NexecuteServer.Config.SpringSecurity;
import com.Nexecute.NexecuteServer.Controller.ExecutionController;
import com.Nexecute.NexecuteServer.Filter.*;
import com.Nexecute.NexecuteServer.Utility.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.util.concurrent.CompletableFuture;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = ExecutionController.class, properties = {
        "app.frontend-url=http://localhost:5173",
        "spring.security.oauth2.client.registration.github.client-id=test-client",
        "spring.security.oauth2.client.registration.github.client-secret=test-secret"})
@Import({SpringSecurity.class, JwtFilter.class})
class TrialAccessTest {
    @Autowired MockMvc mvc;
    @MockitoBean DockerExecutionService sandbox;
    @MockitoBean CodeService history;
    @MockitoBean UserDetailServiceImpl userDetails;
    @MockitoBean GithubOauth2UserService githubUsers;
    @MockitoBean OAuth2LoginSuccessHandler oauthSuccess;
    @MockitoBean JwtUtil jwt;

    @Test void anonymousTrialSucceedsWithoutSavingHistory() throws Exception {
        var execution = mock(DockerExecutionService.Execution.class);
        when(sandbox.prepare(any(), any(), any(), any(), eq(false), any())).thenReturn(execution);
        when(execution.start()).thenReturn(CompletableFuture.completedFuture(new DockerExecutionService.Result("42\n", "", 0, "completed")));
        mvc.perform(post("/api/trial/execute").contentType("application/json")
                .content("{\"language\":\"python\",\"code\":\"print(42)\",\"file\":\"Solution.py\",\"stdin\":\"\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.stdout").value("42\n"));
        verifyNoInteractions(history);
    }
    @Test void privateEndpointsStillRequireAuthentication() throws Exception {
        mvc.perform(get("/api/history")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/execute").contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(sandbox);
    }
}
