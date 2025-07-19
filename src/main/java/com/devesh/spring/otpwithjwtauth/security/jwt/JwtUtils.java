package com.devesh.spring.jwtauth.security.jwt;

import java.security.Key;
import java.util.Date;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.util.WebUtils;

import com.devesh.spring.jwtauth.security.services.UserDetailsImpl;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders; // Added for base64 decoding
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException; // Explicitly import SignatureException

@Component
public class JwtUtils {
  private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);

  @Value("${devesh.app.jwtSecret}")
  private String jwtSecret; // Get from application.properties

  @Value("${devesh.app.jwtExpirationMs}")
  private int jwtExpirationMs; // Access token expiration

  @Value("${devesh.app.jwtCookieName}")
  private String jwtCookie;

  @Value("${devesh.app.jwtRefreshCookieName}") // New property for refresh token cookie name
  private String jwtRefreshCookie;

  @Value("${devesh.app.jwtRefreshExpirationMs}") // New property for refresh token expiration
  private long jwtRefreshExpirationMs;

  private Key key() {
    // Decode the base64 secret string to bytes
    return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
  }

  /**
   * Extract JWT token from HttpOnly cookie
   */
  public String getJwtFromCookies(HttpServletRequest request) {
    Cookie cookie = WebUtils.getCookie(request, jwtCookie);
    return (cookie != null) ? cookie.getValue() : null;
  }

  /**
   * Extract Refresh Token from HttpOnly cookie
   */
  public String getJwtRefreshFromCookies(HttpServletRequest request) {
    Cookie cookie = WebUtils.getCookie(request, jwtRefreshCookie);
    return (cookie != null) ? cookie.getValue() : null;
  }

  /**
   * Generate JWT HttpOnly cookie for authenticated user
   */
  public ResponseCookie generateJwtCookie(UserDetailsImpl userPrincipal) {
    String jwt = generateTokenFromUsername(userPrincipal.getUsername());
    return generateJwtCookie(jwt);
  }

  // Overloaded method to generate access token cookie from an existing JWT string
  public ResponseCookie generateJwtCookie(String jwt) {
    return ResponseCookie.from(jwtCookie, jwt)
            .path("/")
            .maxAge(jwtExpirationMs / 1000) // Convert ms to seconds
            .httpOnly(true)
            .secure(false) // Set to true in production with HTTPS
            .sameSite("Lax") // "Strict" if possible, otherwise "Lax"
            .build();
  }

  /**
   * Generate Refresh Token HttpOnly cookie
   */
  public ResponseCookie generateRefreshTokenCookie(String refreshToken) {
    return ResponseCookie.from(jwtRefreshCookie, refreshToken)
            .path("/api/auth/refreshtoken") // Path specific to refresh token endpoint for stricter SameSite
            .maxAge(jwtRefreshExpirationMs / 1000) // Convert ms to seconds
            .httpOnly(true)
            .secure(false) // Set to true in production with HTTPS
            .sameSite("Lax")
            .build();
  }

  /**
   * Clear JWT cookie (on signout)
   */
  public ResponseCookie getCleanJwtCookie() {
    return ResponseCookie.from(jwtCookie, "")
            .path("/")
            .maxAge(0)
            .httpOnly(true)
            .secure(false)
            .sameSite("Lax")
            .build();
  }

  /**
   * Clear Refresh Token cookie (on signout)
   */
  public ResponseCookie getCleanRefreshTokenCookie() {
    return ResponseCookie.from(jwtRefreshCookie, "")
            .path("/api/auth/refreshtoken") // Must match the refresh token cookie path
            .maxAge(0)
            .httpOnly(true)
            .secure(false)
            .sameSite("Lax")
            .build();
  }

  /**
   * Extract username from JWT token
   */
  public String getUserNameFromJwtToken(String token) {
    return Jwts.parserBuilder()
            .setSigningKey(key())
            .build()
            .parseClaimsJws(token)
            .getBody()
            .getSubject();
  }

  public boolean validateJwtToken(String authToken) {
    try {
      Jwts.parserBuilder()
              .setSigningKey(key())
              .build()
              .parse(authToken);
      return true;
    } catch (MalformedJwtException e) {
      logger.error("Invalid JWT token: {}", e.getMessage());
    } catch (ExpiredJwtException e) {
      logger.error("JWT token is expired: {}", e.getMessage());
    } catch (UnsupportedJwtException e) {
      logger.error("JWT token is unsupported: {}", e.getMessage());
    } catch (IllegalArgumentException e) {
      logger.error("JWT claims string is empty: {}", e.getMessage());
    } catch (SignatureException e) { // Specific catch for signature issues
      logger.error("JWT signature does not match: {}", e.getMessage());
    }
    return false;
  }

  public String generateTokenFromUsername(String username) {
    return Jwts.builder()
            .setSubject(username)
            .setIssuedAt(new Date())
            .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
            .signWith(key(), SignatureAlgorithm.HS256)
            .compact();
  }
}