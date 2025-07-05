package com.devesh.spring.jwtauth.controllers;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.servlet.http.HttpServletRequest; // Import HttpServletRequest
import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.devesh.spring.jwtauth.models.ERole;
import com.devesh.spring.jwtauth.models.Role;
import com.devesh.spring.jwtauth.models.User;
import com.devesh.spring.jwtauth.payload.request.LoginRequest;
import com.devesh.spring.jwtauth.payload.request.SignupRequest;
import com.devesh.spring.jwtauth.payload.response.UserInfoResponse;
import com.devesh.spring.jwtauth.payload.response.MessageResponse;
import com.devesh.spring.jwtauth.repository.RoleRepository;
import com.devesh.spring.jwtauth.repository.UserRepository;
import com.devesh.spring.jwtauth.security.jwt.JwtUtils;
import com.devesh.spring.jwtauth.security.services.UserDetailsImpl;
import com.devesh.spring.jwtauth.security.services.RefreshTokenService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  @Autowired
  AuthenticationManager authenticationManager;

  @Autowired
  UserRepository userRepository;

  @Autowired
  RoleRepository roleRepository;

  @Autowired
  PasswordEncoder encoder;

  @Autowired
  JwtUtils jwtUtils;

  @Autowired
  RefreshTokenService refreshTokenService;

  @PostMapping("/signin")
  public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {

    Authentication authentication = authenticationManager
            .authenticate(new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

    SecurityContextHolder.getContext().setAuthentication(authentication);

    UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

    ResponseCookie jwtCookie = jwtUtils.generateJwtCookie(userDetails);

    // Before creating a new refresh token, delete any existing one for this user.
    // This prevents the "Duplicate entry" error on subsequent logins for the same user.
    // This is crucial for fixing the SQLIntegrityConstraintViolationException.
    refreshTokenService.deleteByUserId(userDetails.getId()); // <--- IMPORTANT FIX

    // Now create a new refresh token
    String refreshToken = refreshTokenService.createRefreshToken(userDetails.getId()).getToken();
    ResponseCookie refreshTokenCookie = jwtUtils.generateRefreshTokenCookie(refreshToken);

    List<String> roles = userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList());

    return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
            .header(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString())
            .body(new UserInfoResponse(userDetails.getId(),
                    userDetails.getUsername(),
                    userDetails.getEmail(),
                    roles));
  }

  @PostMapping("/signup")
  public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
    if (userRepository.existsByUsername(signUpRequest.getUsername())) {
      return ResponseEntity.badRequest().body(new MessageResponse("Error: Username is already taken!"));
    }

    if (userRepository.existsByEmail(signUpRequest.getEmail())) {
      return ResponseEntity.badRequest().body(new MessageResponse("Error: Email is already in use!"));
    }

    // Create new user's account
    User user = new User(signUpRequest.getUsername(),
            signUpRequest.getEmail(),
            encoder.encode(signUpRequest.getPassword()));

    Set<String> strRoles = signUpRequest.getRole();
    Set<Role> roles = new HashSet<>();

    if (strRoles == null) {
      Role userRole = roleRepository.findByName(ERole.ROLE_USER)
              .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
      roles.add(userRole);
    } else {
      strRoles.forEach(role -> {
        switch (role) {
          case "admin":
            Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                    .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            roles.add(adminRole);

            break;
          case "mod":
            Role modRole = roleRepository.findByName(ERole.ROLE_MODERATOR)
                    .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            roles.add(modRole);

            break;
          default:
            Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                    .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            roles.add(userRole);
        }
      });
    }

    user.setRoles(roles);
    userRepository.save(user);

    return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
  }

  @PostMapping("/signout")
  public ResponseEntity<?> logoutUser(HttpServletRequest request) { // Add HttpServletRequest
    // Get refresh token from cookie
    String refreshTokenString = jwtUtils.getJwtRefreshFromCookies(request);

    if (refreshTokenString != null && !refreshTokenString.isEmpty()) {
      try {
        // Attempt to delete the refresh token from the database
        refreshTokenService.deleteByToken(refreshTokenString); // New method to delete by token
      } catch (Exception e) {
        // Log the error but don't prevent logout, as clearing cookies is primary
        System.err.println("Error deleting refresh token on logout: " + e.getMessage());
      }
    }

    // Clear client-side cookies regardless of server-side refresh token deletion status
    ResponseCookie jwtCookie = jwtUtils.getCleanJwtCookie();
    ResponseCookie refreshTokenCookie = jwtUtils.getCleanRefreshTokenCookie();

    return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
            .header(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString())
            .body(new MessageResponse("You've been signed out!"));
  }

  @PostMapping("/refreshtoken")
  public ResponseEntity<?> refreshtoken(HttpServletRequest request) { // Use jakarta.servlet.http.HttpServletRequest
    String refreshTokenString = jwtUtils.getJwtRefreshFromCookies(request);

    if ((refreshTokenString != null) && (refreshTokenString.length() > 0)) {
      return refreshTokenService.findByToken(refreshTokenString)
              .map(refreshTokenService::verifyExpiration)
              .map(refreshToken -> {
                String username = refreshToken.getUser().getUsername();
                String newAccessToken = jwtUtils.generateTokenFromUsername(username);
                ResponseCookie jwtCookie = jwtUtils.generateJwtCookie(newAccessToken);

                // Optional: Refresh token rotation -
                // If you want to issue a new refresh token every time,
                // delete the old one and create a new one here.
                // For now, we reuse the existing refresh token until its expiry.

                return ResponseEntity.ok()
                        .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
                        .body(new MessageResponse("Token refreshed successfully!"));
              })
              .orElseThrow(() -> new RuntimeException("Refresh token is not in database!"));
    }

    return ResponseEntity.badRequest().body(new MessageResponse("Refresh Token is empty!"));
  }

  @GetMapping("/me")
  public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal UserDetailsImpl userDetails) {
    if (userDetails == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Not authenticated");
    }

    List<String> roles = userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList());

    return ResponseEntity.ok(new UserInfoResponse(
            userDetails.getId(),
            userDetails.getUsername(),
            userDetails.getEmail(),
            roles
    ));
  }
}