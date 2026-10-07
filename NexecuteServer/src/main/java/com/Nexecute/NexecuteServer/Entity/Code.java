package com.Nexecute.NexecuteServer.Entity;

import jakarta.persistence.*;
import lombok.*;


import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "Code")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Code {
    @Id()
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false,columnDefinition = "TEXT")
    private String code;

    @Column(nullable = false)
    private String fileName;

    private String language;
    private String status;
    private Integer exitCode;

    @ManyToOne
    @JoinColumn(nullable = false)
    private Users user;

    @Column(nullable = false)
    private Instant createdAt;

    @Column
    private Instant lastEdit;
}
