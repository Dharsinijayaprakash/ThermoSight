package com.acme.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class CorsConfig {

    // Comma-separated list. Examples:
    // "https://your-frontend.vercel.app,https://*.vercel.app,http://localhost:5173"
    @Value("${app.cors.allowed-origins:}")
    private String allowedOrigins; // exact origins (no wildcards)
    @Value("${app.cors.allowed-origin-patterns:https://*.vercel.app}")
    private String allowedOriginPatterns; // supports wildcards (*.vercel.app)

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                var mapping = registry.addMapping("/**")
                        .allowedMethods("GET","POST","PUT","DELETE","OPTIONS","PATCH")
                        .allowedHeaders("*")
                        .exposedHeaders("Location")
                        .maxAge(3600);

                // Prefer exact origins if provided; otherwise fall back to patterns.
                if (!allowedOrigins.isBlank()) {
                    mapping.allowedOrigins(
                            Arrays.stream(allowedOrigins.split(","))
                                    .map(String::trim)
                                    .filter(s -> !s.isEmpty())
                                    .toArray(String[]::new)
                    );
                } else {
                    mapping.allowedOriginPatterns(
                            Arrays.stream(allowedOriginPatterns.split(","))
                                    .map(String::trim)
                                    .filter(s -> !s.isEmpty())
                                    .toArray(String[]::new)
                    );
                }

                // If you plan to use cookies/auth headers, set allowCredentials(true)
                // and DO NOT use "*" or patterns — list exact origins instead.
                mapping.allowCredentials(true);
            }
        };
    }
}