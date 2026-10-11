package com.acme.backend.service;

import com.acme.backend.api.dto.AuthRequest.*;
import com.acme.backend.api.dto.AuthResponse;
import com.acme.backend.domain.User;
import com.acme.backend.repository.UserRepository;
import com.acme.backend.security.JwtUtil;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.Optional;

@Service
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Value("${app.google.client-id:}")
    private String googleClientId;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (user.getProvider() != User.Provider.EMAIL) {
            throw new RuntimeException("Please use " + user.getProvider().name().toLowerCase() + " to sign in");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        // Update last login
        user.setLastLogin(Instant.now());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user);
        return new AuthResponse(token, AuthResponse.UserDTO.fromUser(user));
    }

    public AuthResponse signup(SignupRequest request) {
        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        // Create new user
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(User.Role.INSPECTOR); // Default role
        user.setProvider(User.Provider.EMAIL);
        user.setTheme(User.Theme.SYSTEM);
        user.setNotificationsEnabled(true);
        user.setEmailNotificationsEnabled(true);
        user.setLanguage("en");
        user.setTimezone("UTC");

        user = userRepository.save(user);

        String token = jwtUtil.generateToken(user);
        return new AuthResponse(token, AuthResponse.UserDTO.fromUser(user));
    }

    public AuthResponse authenticateWithGoogle(GoogleAuthRequest request) {
        try {
            // Verify Google token
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(request.getCredential());
            if (idToken == null) {
                throw new RuntimeException("Invalid Google token");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String googleId = payload.getSubject();
            String email = payload.getEmail();
            String name = (String) payload.get("name");
            String picture = (String) payload.get("picture");

            // Check if user exists by Google ID or email
            Optional<User> existingUser = userRepository.findByGoogleId(googleId);
            if (existingUser.isEmpty()) {
                existingUser = userRepository.findByEmail(email);
            }

            User user;
            if (existingUser.isPresent()) {
                user = existingUser.get();
                // Update Google info if needed
                if (user.getGoogleId() == null) {
                    user.setGoogleId(googleId);
                    user.setProvider(User.Provider.GOOGLE);
                }
                if (picture != null && user.getAvatar() == null) {
                    user.setAvatar(picture);
                }
                user.setLastLogin(Instant.now());
                user = userRepository.save(user);
            } else {
                // Create new user from Google info
                user = new User();
                user.setGoogleId(googleId);
                user.setEmail(email);
                user.setName(name);
                user.setAvatar(picture);
                user.setProvider(User.Provider.GOOGLE);
                user.setRole(User.Role.INSPECTOR);
                user.setTheme(User.Theme.SYSTEM);
                user.setNotificationsEnabled(true);
                user.setEmailNotificationsEnabled(true);
                user.setLanguage("en");
                user.setTimezone("UTC");
                user = userRepository.save(user);
            }

            String token = jwtUtil.generateToken(user);
            return new AuthResponse(token, AuthResponse.UserDTO.fromUser(user));

        } catch (Exception e) {
            throw new RuntimeException("Google authentication failed: " + e.getMessage());
        }
    }

    public AuthResponse.UserDTO getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return AuthResponse.UserDTO.fromUser(user);
    }

    public AuthResponse.UserDTO updateProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getName() != null && !request.getName().isBlank()) {
            user.setName(request.getName());
        }
        if (request.getAvatar() != null) {
            user.setAvatar(request.getAvatar());
        }

        user = userRepository.save(user);
        return AuthResponse.UserDTO.fromUser(user);
    }

    public AuthResponse.UserDTO updatePreferences(String email, UpdatePreferencesRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getTheme() != null) {
            user.setTheme(User.Theme.valueOf(request.getTheme().toUpperCase()));
        }
        if (request.getNotifications() != null) {
            user.setNotificationsEnabled(request.getNotifications());
        }
        if (request.getEmailNotifications() != null) {
            user.setEmailNotificationsEnabled(request.getEmailNotifications());
        }
        if (request.getLanguage() != null) {
            user.setLanguage(request.getLanguage());
        }
        if (request.getTimezone() != null) {
            user.setTimezone(request.getTimezone());
        }

        user = userRepository.save(user);
        return AuthResponse.UserDTO.fromUser(user);
    }

    public void changePassword(String email, ChangePasswordRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getProvider() != User.Provider.EMAIL) {
            throw new RuntimeException("Cannot change password for " + user.getProvider().name().toLowerCase() + " accounts");
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
