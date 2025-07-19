package com.devesh.spring.otpwithjwtauth.controllers;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.devesh.spring.otpwithjwtauth.models.ERole;
import com.devesh.spring.otpwithjwtauth.models.Role;
import com.devesh.spring.otpwithjwtauth.models.User;
import com.devesh.spring.otpwithjwtauth.payload.request.LoginRequest;
import com.devesh.spring.otpwithjwtauth.payload.request.SignupRequest;
import com.devesh.spring.otpwithjwtauth.payload.response.MessageResponse;
import com.devesh.spring.otpwithjwtauth.payload.response.UserInfoResponse;
import com.devesh.spring.otpwithjwtauth.repository.RoleRepository;
import com.devesh.spring.otpwithjwtauth.repository.UserRepository;
import com.devesh.spring.otpwithjwtauth.security.jwt.JwtUtils;
import com.devesh.spring.otpwithjwtauth.security.services.EmailService;
import com.devesh.spring.otpwithjwtauth.security.services.OtpService;
import com.devesh.spring.otpwithjwtauth.security.services.RefreshTokenService;
import com.devesh.spring.otpwithjwtauth.security.services.UserDetailsImpl;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

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
  private EmailService emailService;

  @Autowired
  JwtUtils jwtUtils;

  @Autowired
  RefreshTokenService refreshTokenService;

  @Autowired
  OtpService otpService;

  /**
   * Step 1: Authenticate user credentials and send OTP.
   * This endpoint now validates username/password and sends an OTP to the user's email
   * instead of returning JWTs directly.
   */
  @PostMapping("/signin")
  public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
    // Authenticate the user. This will throw an exception if credentials are bad.
    Authentication authentication = authenticationManager
            .authenticate(new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

    // If authentication is successful, get user details
    UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
    String email = userDetails.getEmail();

    // Generate and send OTP
    System.out.println(email);
    String otp = otpService.generateOtp(loginRequest.getUsername());
    emailService.sendOtpEmail(email, otp); // Assumes EmailService is configured to send emails

    return ResponseEntity.ok(new MessageResponse("OTP has been sent to your email for verification."));
  }

  /**
   * Step 2: Verify OTP and generate JWTs.
   * This new endpoint verifies the submitted OTP. If correct, it generates and returns
   * the JWT and Refresh Token cookies.
   */
  @PostMapping("/verify-otp")
  public ResponseEntity<?> verifyOtpAndGenerateTokens(@Valid @RequestBody OtpVerificationRequest verificationRequest) {
    String serverOtp = otpService.getOtp(verificationRequest.getUsername());

    // Check if OTP is valid
    if (serverOtp == null || !serverOtp.equals(verificationRequest.getOtp())) {
      return ResponseEntity.badRequest().body(new MessageResponse("Error: Invalid OTP!"));
    }

    // OTP is correct, clear it from the cache
    otpService.clearOtp(verificationRequest.getUsername());

    // The user is authenticated via OTP, now generate tokens
    // We fetch the user details again to ensure we have the latest data
    User user = userRepository.findByUsername(verificationRequest.getUsername())
            .orElseThrow(() -> new RuntimeException("Error: User not found after OTP verification."));
    UserDetailsImpl userDetails = UserDetailsImpl.build(user);

    // Set authentication in SecurityContext
    Authentication authentication = new UsernamePasswordAuthenticationToken(
            userDetails, null, userDetails.getAuthorities());
    SecurityContextHolder.getContext().setAuthentication(authentication);

    // Generate JWT cookie
    ResponseCookie jwtCookie = jwtUtils.generateJwtCookie(userDetails);

    // Manage Refresh Token
    refreshTokenService.deleteByUserId(userDetails.getId());
    String refreshToken = refreshTokenService.createRefreshToken(userDetails.getId()).getToken();
    ResponseCookie refreshTokenCookie = jwtUtils.generateRefreshTokenCookie(refreshToken);

    List<String> roles = userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList());

    // Return response with cookies and user info
    return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
            .header(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString())
            .body(new UserInfoResponse(userDetails.getId(),
                    userDetails.getUsername(),
                    userDetails.getEmail(),
                    roles));
  }

  // DTO for the OTP verification request body
  static class OtpVerificationRequest {
    @NotBlank
    private String username;

    @NotBlank
    private String otp;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }
  }

  @PostMapping("/signup")
  public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
    if (userRepository.existsByUsername(signUpRequest.getUsername())) {
      return ResponseEntity.badRequest().body(new MessageResponse("Error: Username is already taken!"));
    }

    if (userRepository.existsByEmail(signUpRequest.getEmail())) {
      return ResponseEntity.badRequest().body(new MessageResponse("Error: Email is already in use!"));
    }

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
          if (role.equals("admin")) {
              Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                      .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
              roles.add(adminRole);
          } else {
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
  public ResponseEntity<?> logoutUser(HttpServletRequest request) {
    String refreshTokenString = jwtUtils.getJwtRefreshFromCookies(request);

    if (refreshTokenString != null && !refreshTokenString.isEmpty()) {
      try {
        refreshTokenService.deleteByToken(refreshTokenString);
      } catch (Exception e) {
        System.err.println("Error deleting refresh token on logout: " + e.getMessage());
      }
    }

    ResponseCookie jwtCookie = jwtUtils.getCleanJwtCookie();
    ResponseCookie refreshTokenCookie = jwtUtils.getCleanRefreshTokenCookie();

    return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, jwtCookie.toString())
            .header(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString())
            .body(new MessageResponse("You've been signed out!"));
  }

  @PostMapping("/refreshtoken")
  public ResponseEntity<?> refreshtoken(HttpServletRequest request) {
    String refreshTokenString = jwtUtils.getJwtRefreshFromCookies(request);

    if ((refreshTokenString != null) && (refreshTokenString.length() > 0)) {
      return refreshTokenService.findByToken(refreshTokenString)
              .map(refreshTokenService::verifyExpiration)
              .map(refreshToken -> {
                String username = refreshToken.getUser().getUsername();
                String newAccessToken = jwtUtils.generateTokenFromUsername(username);
                ResponseCookie jwtCookie = jwtUtils.generateJwtCookie(newAccessToken);
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
            roles));
  }

  @GetMapping("/checkUsername")
  public ResponseEntity<?> checkUsernameAvailability(@RequestParam String username) {
    try {
      boolean exists = userRepository.existsByUsername(username);
      return ResponseEntity.ok(Map.of("available", !exists));
    } catch (Exception e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
              .body(Map.of("error", "Server error while checking username"));
    }
  }


}