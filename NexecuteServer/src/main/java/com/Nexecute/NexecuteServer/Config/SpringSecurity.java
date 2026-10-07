package com.Nexecute.NexecuteServer.Config;

import com.Nexecute.NexecuteServer.Filter.GithubOauth2UserService;
import com.Nexecute.NexecuteServer.Filter.JwtFilter;
import com.Nexecute.NexecuteServer.Filter.OAuth2LoginSuccessHandler;
import com.Nexecute.NexecuteServer.Service.UserDetailServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.*;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SpringSecurity {
    private final UserDetailServiceImpl userDetailService;
    private final JwtFilter jwtFilter;
    private final OAuth2LoginSuccessHandler oauth2LoginSuccessHandler;
    @Value("${app.frontend-url}") String frontendUrl;
    private final GithubOauth2UserService githubOauth2UserService;


    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .cors(Customizer.withDefaults())
                .csrf(csrf->csrf.disable())
                .sessionManagement(session->session.sessionCreationPolicy((SessionCreationPolicy.IF_REQUIRED)))
                .authorizeHttpRequests(auth->auth
                        .requestMatchers("/auth/**").permitAll()
                        .requestMatchers("/api/trial/execute", "/ws/execute", "/ws/ide").permitAll()
                        .requestMatchers("/auth/login-url","/oauth2/**","/login/oauth2/**","/error").permitAll()
                        .anyRequest().authenticated()

                )
                .exceptionHandling(e->e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .httpBasic(httpBasic->httpBasic.disable())
                .formLogin(form->form.disable())
                .oauth2Login(oauth -> oauth
                        .userInfoEndpoint(userInfo -> userInfo.userService(githubOauth2UserService))
                        .successHandler(oauth2LoginSuccessHandler)   // <-- swap this
                        .failureHandler(oauth2FailureHandler())
                )
                .logout(logout->logout
                        .logoutUrl("/auth/logout")
                        .logoutSuccessHandler((request, response, authentication) -> {
                            ResponseCookie clearCookie = ResponseCookie.from("refreshToken", "")
                                    .httpOnly(true).path("/auth/refresh").maxAge(0).build();
                            response.addHeader(HttpHeaders.SET_COOKIE, clearCookie.toString());
                            response.setStatus(HttpStatus.NO_CONTENT.value());
                        })
                        .clearAuthentication(true)
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }



    AuthenticationSuccessHandler oauth2SuccessHandler() {

        SimpleUrlAuthenticationSuccessHandler handler=new SimpleUrlAuthenticationSuccessHandler();
        handler.setDefaultTargetUrl(frontendUrl+"/auth/callback");
        return handler;
    }


    AuthenticationFailureHandler oauth2FailureHandler() {

        SimpleUrlAuthenticationFailureHandler handler=new SimpleUrlAuthenticationFailureHandler();
        handler.setDefaultFailureUrl(frontendUrl+"/login?error=oauth_failed");
        return handler;
    }
}
