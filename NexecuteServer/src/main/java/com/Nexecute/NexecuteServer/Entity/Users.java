package com.Nexecute.NexecuteServer.Entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(columnNames = "email"),
        @UniqueConstraint(columnNames = "userName"),
        @UniqueConstraint(columnNames = "gitHubId")
})
@Getter
@Setter
@AllArgsConstructor
@Builder
@NoArgsConstructor
public class Users {
    @Id()
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(unique = true, nullable = false)
    private String userName;

    @Column
    private String password;

    @Column(name = "gitHubId", unique = true)
    private String gitHubId;

    @Column
    private String gitHubUsername;

    @Column(columnDefinition = "TEXT")
    private String gitHubAccessToken;

    @Column(nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.USER;

    @Column(nullable = false,updatable = false)
    @CreationTimestamp
    private Instant createdAt;

    @Column()
    private Instant lastLoginAt;

    public enum Role { USER, ADMIN }

}
