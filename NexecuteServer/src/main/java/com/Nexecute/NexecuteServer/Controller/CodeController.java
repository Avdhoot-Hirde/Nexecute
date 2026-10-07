package com.Nexecute.NexecuteServer.Controller;

import com.Nexecute.NexecuteServer.DTO.CodeHistoryDto;
import com.Nexecute.NexecuteServer.DTO.ExcecutionDto;
import com.Nexecute.NexecuteServer.Entity.Users;
import com.Nexecute.NexecuteServer.Filter.CurrentUser;
import com.Nexecute.NexecuteServer.Service.CodeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CodeController {
    private final CodeService codeService;
    private final CurrentUser currentUser;
    
    @GetMapping("/history")
    public ResponseEntity<?> showHistory(){
        Users user = currentUser.require().getUser();
        List<CodeHistoryDto> history = codeService.getAllByUser(user);
        return ResponseEntity.ok(history);
    }

    @GetMapping("/history/{id}")
    public ResponseEntity<CodeHistoryDto> showCode(@PathVariable UUID id){
        Users user = currentUser.require().getUser();
        return ResponseEntity.ok(codeService.getCodeById(id,user));
    }

    @PostMapping
    public ResponseEntity<?> CodeExcecution(@RequestBody ExcecutionDto excecutionDto){
        return ResponseEntity.ok(false);
    }
}
