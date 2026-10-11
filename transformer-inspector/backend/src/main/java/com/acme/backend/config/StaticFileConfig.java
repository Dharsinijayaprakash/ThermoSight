package com.acme.backend.config;

import com.acme.backend.storage.FileStorageService;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.nio.file.Path;

@Configuration
public class StaticFileConfig implements WebMvcConfigurer {
    private final FileStorageService storageService;

    public StaticFileConfig(FileStorageService storageService) {
        this.storageService = storageService;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path base = storageService.getStorageRoot();
        String uri = base.toUri().toString();
        if (!uri.endsWith("/")) {
            uri += "/";
        }
        registry.addResourceHandler("/files/**")
                .addResourceLocations(uri);
    }
}