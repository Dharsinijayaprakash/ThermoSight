package com.acme.backend.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthRequest {

    // Login Request
    public static class LoginRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        private String password;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    // Signup Request
    public static class SignupRequest {
        @NotBlank(message = "Name is required")
        @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
        private String name;

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        private String password;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    // Google OAuth Request
    public static class GoogleAuthRequest {
        @NotBlank(message = "Credential is required")
        private String credential;

        public String getCredential() { return credential; }
        public void setCredential(String credential) { this.credential = credential; }
    }

    // Update Profile Request
    public static class UpdateProfileRequest {
        private String name;
        private String email;
        private String avatar;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getAvatar() { return avatar; }
        public void setAvatar(String avatar) { this.avatar = avatar; }
    }

    // Update Preferences Request
    public static class UpdatePreferencesRequest {
        private String theme;
        private Boolean notifications;
        private Boolean emailNotifications;
        private String language;
        private String timezone;

        public String getTheme() { return theme; }
        public void setTheme(String theme) { this.theme = theme; }
        public Boolean getNotifications() { return notifications; }
        public void setNotifications(Boolean notifications) { this.notifications = notifications; }
        public Boolean getEmailNotifications() { return emailNotifications; }
        public void setEmailNotifications(Boolean emailNotifications) { this.emailNotifications = emailNotifications; }
        public String getLanguage() { return language; }
        public void setLanguage(String language) { this.language = language; }
        public String getTimezone() { return timezone; }
        public void setTimezone(String timezone) { this.timezone = timezone; }
    }

    // Change Password Request
    public static class ChangePasswordRequest {
        @NotBlank(message = "Current password is required")
        private String currentPassword;

        @NotBlank(message = "New password is required")
        @Size(min = 8, message = "New password must be at least 8 characters")
        private String newPassword;

        public String getCurrentPassword() { return currentPassword; }
        public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }
}
