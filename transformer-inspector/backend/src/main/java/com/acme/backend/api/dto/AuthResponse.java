package com.acme.backend.api.dto;

import com.acme.backend.domain.User;

public class AuthResponse {

    private String token;
    private UserDTO user;

    public AuthResponse(String token, UserDTO user) {
        this.token = token;
        this.user = user;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public UserDTO getUser() { return user; }
    public void setUser(UserDTO user) { this.user = user; }

    // Nested User DTO
    public static class UserDTO {
        private String id;
        private String email;
        private String name;
        private String avatar;
        private String role;
        private String provider;
        private String createdAt;
        private String lastLogin;
        private PreferencesDTO preferences;

        public static UserDTO fromUser(User user) {
            UserDTO dto = new UserDTO();
            dto.id = user.getId().toString();
            dto.email = user.getEmail();
            dto.name = user.getName();
            dto.avatar = user.getAvatar();
            dto.role = user.getRole().name().toLowerCase();
            dto.provider = user.getProvider().name().toLowerCase();
            dto.createdAt = user.getCreatedAt() != null ? user.getCreatedAt().toString() : null;
            dto.lastLogin = user.getLastLogin() != null ? user.getLastLogin().toString() : null;
            
            PreferencesDTO prefs = new PreferencesDTO();
            prefs.theme = user.getTheme() != null ? user.getTheme().name().toLowerCase() : "system";
            prefs.notifications = user.getNotificationsEnabled() != null ? user.getNotificationsEnabled() : true;
            prefs.emailNotifications = user.getEmailNotificationsEnabled() != null ? user.getEmailNotificationsEnabled() : true;
            prefs.language = user.getLanguage() != null ? user.getLanguage() : "en";
            prefs.timezone = user.getTimezone() != null ? user.getTimezone() : "UTC";
            dto.preferences = prefs;
            
            return dto;
        }

        // Getters and Setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getAvatar() { return avatar; }
        public void setAvatar(String avatar) { this.avatar = avatar; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider; }
        public String getCreatedAt() { return createdAt; }
        public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
        public String getLastLogin() { return lastLogin; }
        public void setLastLogin(String lastLogin) { this.lastLogin = lastLogin; }
        public PreferencesDTO getPreferences() { return preferences; }
        public void setPreferences(PreferencesDTO preferences) { this.preferences = preferences; }
    }

    public static class PreferencesDTO {
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
}
