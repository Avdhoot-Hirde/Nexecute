package com.Nexecute.NexecuteServer.Service;

import com.Nexecute.NexecuteServer.DTO.CodeHistoryDto;
import com.Nexecute.NexecuteServer.Entity.Code;
import com.Nexecute.NexecuteServer.Entity.Users;
import com.Nexecute.NexecuteServer.ExceptionHandler.CodeNotFountException;
import com.Nexecute.NexecuteServer.Repo.CodeRepo;
import com.Nexecute.NexecuteServer.Repo.UserRepo;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CodeService {
    private final CodeRepo repo;
    private final UserRepo users;

    @Transactional
    public CodeHistoryDto saveRun(Users user, String language, String file, String source, DockerExecutionService.Result result) {
        return toDto(repo.save(Code.builder().user(user).language(language)
                .fileName(DockerExecutionService.sourceFileName(language, file)).code(source)
                .status(result.status().equals("completed") ? "done" : "error")
                .exitCode(result.exitCode()).createdAt(Instant.now()).build()));
    }

    @Transactional
    public CodeHistoryDto saveRun(String username, String language, String file, String source, DockerExecutionService.Result result) {
        Users user = users.findByUserName(username).orElseThrow(() -> new IllegalArgumentException("History owner no longer exists."));
        return saveRun(user, language, file, source, result);
    }

    public List<CodeHistoryDto> getAllByUser(Users user){
        return repo.findAllByUserOrderByCreatedAtDesc(user).stream().map(this::toDto).toList();
    }

    public CodeHistoryDto getCodeById(UUID id, Users user){
        Code code = repo.findByIdAndUser(id, user)
                .orElseThrow(() -> new CodeNotFountException("Code does not exist"));
        return toDto(code);
    }

    public void deleteCodeById(UUID id,Users user){
        repo.deleteByIdAndUser(id,user);
    }
    private CodeHistoryDto toDto(Code c){
        return CodeHistoryDto.builder()
                .id(c.getId())
                .fileName(c.getFileName())
                .lastEdit(c.getLastEdit())
                .code(c.getCode())
                .language(c.getLanguage() == null ? languageFromFile(c.getFileName()) : c.getLanguage())
                .status(c.getStatus() == null ? "done" : c.getStatus())
                .exitCode(c.getExitCode())
                .createdAt(c.getCreatedAt())
                .build();
    }
    private String languageFromFile(String file) {
        if (file == null) return "python";
        return switch (file.substring(file.lastIndexOf('.') + 1)) {
            case "java" -> "java"; case "js" -> "javascript"; case "ts" -> "typescript";
            case "cpp" -> "cpp"; case "c" -> "c"; case "go" -> "go";
            case "rs" -> "rust"; case "rb" -> "ruby"; case "php" -> "php";
            default -> "python";
        };
    }
}
