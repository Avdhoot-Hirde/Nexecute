package com.Nexecute.NexecuteServer.Service;

import com.Nexecute.NexecuteServer.Controller.ExecutionController;
import com.Nexecute.NexecuteServer.Entity.Users;
import com.Nexecute.NexecuteServer.Filter.AppUserPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class ExecutionHistoryTest {
    @Test void savesFailedAuthenticatedRunsButNotAnonymousTrials() {
        var sandbox = mock(DockerExecutionService.class);
        var history = mock(CodeService.class);
        var execution = mock(DockerExecutionService.Execution.class);
        var result = new DockerExecutionService.Result("", "bad code", 1, "error");
        when(sandbox.prepare(any(), any(), any(), any(), eq(false), any())).thenReturn(execution);
        when(execution.start()).thenReturn(CompletableFuture.completedFuture(result));
        var controller = new ExecutionController(sandbox, history);
        var request = new ExecutionController.Request("java", "bad code", "", "Main.java");
        var user = Users.builder().userName("ada").build();
        var auth = new UsernamePasswordAuthenticationToken(new AppUserPrincipal(user, Map.of()), null);
        assertEquals(422, controller.execute(request, auth).getStatusCode().value());
        verify(history).saveRun(user, "java", "Main.java", "bad code", result);
        clearInvocations(history);
        controller.execute(request, null);
        verifyNoInteractions(history);
    }
}
