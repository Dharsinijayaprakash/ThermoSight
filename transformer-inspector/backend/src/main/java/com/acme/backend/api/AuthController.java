package com.acme.backend.api;

import com.acme.backend.api.dto.AuthRequest.*;
import com.acme.backend.api.dto.AuthResponse;
import com.acme.backend.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"})
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {
        try {
            // Validate request
            if (request.getName() == null || request.getName().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Name is required"));
            }
            if (request.getEmail() == null || request.getEmail().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
            }
            if (request.getPassword() == null || request.getPassword().length() < 8) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 8 characters"));
            }

            AuthResponse response = authService.signup(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleAuth(@RequestBody GoogleAuthRequest request) {
        try {
            AuthResponse response = authService.authenticateWithGoogle(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
                return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
            }
            
            String email = auth.getName();
            AuthResponse.UserDTO user = authService.getCurrentUser(email);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateProfileRequest request) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
            }
            
            String email = auth.getName();
            AuthResponse.UserDTO user = authService.updateProfile(email, request);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/preferences")
    public ResponseEntity<?> updatePreferences(@RequestBody UpdatePreferencesRequest request) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
            }
            
            String email = auth.getName();
            AuthResponse.UserDTO user = authService.updatePreferences(email, request);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
            }
            
            // Validate passwords
            if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Current password is required"));
            }
            if (request.getNewPassword() == null || request.getNewPassword().length() < 8) {
                return ResponseEntity.badRequest().body(Map.of("error", "New password must be at least 8 characters"));
            }
            
            String email = auth.getName();
            authService.changePassword(email, request);
            return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        // JWT is stateless, so logout is handled client-side by removing the token
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}
