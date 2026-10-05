package com.Nexecute.NexecuteServer.Controller;

import com.Nexecute.NexecuteServer.DTO.CodeHistoryDto;
import com.Nexecute.NexecuteServer.Entity.Users;
import com.Nexecute.NexecuteServer.Filter.AppUserPrincipal;
import com.Nexecute.NexecuteServer.Filter.CurrentUser;
import com.Nexecute.NexecuteServer.Service.CodeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HistoryController {
    private final CodeService codeService;
    private final CurrentUser currentUser;
    
    @GetMapping("/history")
    public ResponseEntity<?> showHistory(){
        Users user = currentUser.require().getUser();
        List<CodeHistoryDto> history = codeService.getAllByUser(user);
        return ResponseEntity.ok(history);
    }

    @GetMapping("/history/{id}")
    public ResponseEntity<?> showCode(@RequestParam UUID id,CodeHistoryDto dto){
        Users user = currentUser.require().getUser();
        return ResponseEntity.ok(codeService.getCodeById(id,user));
    }
}
