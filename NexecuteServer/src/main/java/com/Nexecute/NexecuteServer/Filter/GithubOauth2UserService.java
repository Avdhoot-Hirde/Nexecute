package com.Nexecute.NexecuteServer.Filter;

import com.Nexecute.NexecuteServer.Entity.Users;
import com.Nexecute.NexecuteServer.Service.AuthService;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@RequiredArgsConstructor
@Service
public class GithubOauth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final AuthService authService;
    private final DefaultOAuth2UserService delegate=new DefaultOAuth2UserService();

    @Override
    public @Nullable OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User gitHubUser = delegate.loadUser(userRequest);
        String accessToken = userRequest.getAccessToken().getTokenValue();
        String scope=userRequest.getAccessToken().getScopes() !=null
                ? String.join(",",userRequest.getAccessToken().getScopes())
                : "read:user,repo";
        Users user=authService.upsertGithub(gitHubUser.getAttributes(),accessToken,scope);
        return new AppUserPrincipal(user,gitHubUser.getAttributes());
    }
}
