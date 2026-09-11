package com.Nexecute.NexecuteServer.Utility;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;


@Component
public class JwtUtil {
    @Value("${jwt.secret}")
    private String SECRET_KEY;

    private SecretKey getSignedKey(){
        return Keys.hmacShaKeyFor(SECRET_KEY.getBytes(StandardCharsets.UTF_8));
    }
    public String generateToken(String userName, int ttl){
        Map<String,Object> claims=new HashMap<>();
        return createToken(claims,userName,ttl);
    }
    private String createToken(Map<String,Object> claim,String subject,long ttl){
        return Jwts.builder()
                .claims(claim)
                .subject(subject)
                .header().empty().add("typ","jwt")
                .and()
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis()+60000L*ttl))
                .signWith(getSignedKey())
                .compact();
    }

    public String extractUserName(String jwt) {
        return extractAllClaims(jwt).getSubject();
    }

    private Claims extractAllClaims(String jwt) {
        return Jwts.parser()
                .verifyWith(getSignedKey())
                .build()
                .parseSignedClaims(jwt)
                .getPayload();
    }
    public Boolean validateToken(String jwt){
        try{
            return !isTokenExpired(jwt);
        }catch(JwtException | IllegalArgumentException e){
            return false;
        }
    }

    private boolean isTokenExpired(String jwt) {
        return extractExpiration(jwt).before(new Date());
    }

    private Date extractExpiration(String jwt) {
        return extractAllClaims(jwt).getExpiration();
    }
}
