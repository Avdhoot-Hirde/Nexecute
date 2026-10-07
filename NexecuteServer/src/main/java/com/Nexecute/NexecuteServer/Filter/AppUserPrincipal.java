package com.Nexecute.NexecuteServer.Filter;

import com.Nexecute.NexecuteServer.Entity.Users;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;

public class AppUserPrincipal implements OAuth2User, UserDetails {
    private final Users user;
    private final Map<String, Object> attributes;

    public AppUserPrincipal(Users user, Map<String, Object> attributes) {
        this.user = user;
        this.attributes = attributes != null ? attributes : Map.of();
    }

    public UUID getId() { return user.getId(); }
    public Users getUser() { return user; }

    @Override
    public Map<String, Object> getAttributes() { return attributes; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return AuthorityUtils.createAuthorityList("ROLE_" + user.getRole().name());
    }

    @Override
    public String getName() { return user.getId().toString(); } // stable, not username

    // --- UserDetails methods ---
    @Override public String getUsername() { return user.getUserName(); }
    @Override public String getPassword() { return user.getPassword(); }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return true; }
}

