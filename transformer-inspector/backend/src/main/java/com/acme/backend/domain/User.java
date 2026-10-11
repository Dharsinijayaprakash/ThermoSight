package com.acme.backend.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "transx_users")
public class User {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column
    private String password; // Null for Google OAuth users

    @Column
    private String avatar;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.INSPECTOR;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Provider provider = Provider.EMAIL;

    @Column(name = "google_id")
    private String googleId;

    // Preferences stored as JSON or separate columns
    @Enumerated(EnumType.STRING)
    @Column(name = "theme_preference")
    private Theme theme = Theme.SYSTEM;

    @Column(name = "notifications_enabled")
    private Boolean notificationsEnabled = true;

    @Column(name = "email_notifications_enabled")
    private Boolean emailNotificationsEnabled = true;

    @Column(name = "language_preference")
    private String language = "en";

    @Column(name = "timezone_preference")
    private String timezone = "UTC";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "last_login")
    private Instant lastLogin;

    @Column(name = "is_active")
    private Boolean isActive = true;

    public enum Role {
        ADMIN, INSPECTOR, VIEWER
    }

    public enum Provider {
        EMAIL, GOOGLE
    }

    public enum Theme {
        LIGHT, DARK, SYSTEM
    }

    // Default constructor
    public User() {}

    // Constructor for email signup
    public User(String name, String email, String password) {
        this.name = name;
        this.email = email;
        this.password = password;
        this.provider = Provider.EMAIL;
    }

    // Constructor for Google OAuth
    public User(String name, String email, String googleId, String avatar) {
        this.name = name;
        this.email = email;
        this.googleId = googleId;
        this.avatar = avatar;
        this.provider = Provider.GOOGLE;
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public Provider getProvider() {
        return provider;
    }

    public void setProvider(Provider provider) {
        this.provider = provider;
    }

    public String getGoogleId() {
        return googleId;
    }

    public void setGoogleId(String googleId) {
        this.googleId = googleId;
    }

    public Theme getTheme() {
        return theme;
    }

    public void setTheme(Theme theme) {
        this.theme = theme;
    }

    public Boolean getNotificationsEnabled() {
        return notificationsEnabled;
    }

    public void setNotificationsEnabled(Boolean notificationsEnabled) {
        this.notificationsEnabled = notificationsEnabled;
    }

    public Boolean getEmailNotificationsEnabled() {
        return emailNotificationsEnabled;
    }

    public void setEmailNotificationsEnabled(Boolean emailNotificationsEnabled) {
        this.emailNotificationsEnabled = emailNotificationsEnabled;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Instant getLastLogin() {
        return lastLogin;
    }

    public void setLastLogin(Instant lastLogin) {
        this.lastLogin = lastLogin;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }
}
