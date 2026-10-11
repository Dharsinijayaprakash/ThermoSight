package com.acme.backend.security;

import com.acme.backend.domain.User;
import com.acme.backend.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.UUID;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) throws ServletException, IOException {
        
        final String authorizationHeader = request.getHeader("Authorization");

        String userId = null;
        String jwt = null;

        // Extract JWT from Bearer token
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            jwt = authorizationHeader.substring(7);
            try {
                userId = jwtUtil.extractUserId(jwt);
            } catch (Exception e) {
                // Invalid token, continue without authentication
                System.out.println("JWT Extraction failed: " + e.getMessage());
            }
        } else {
            System.out.println("No Bearer token found in Authorization header");
        }

        // Validate token and set authentication
        if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UUID uuid = UUID.fromString(userId);
                User user = userRepository.findById(uuid).orElse(null);

                if (user != null && jwtUtil.validateToken(jwt, user)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            user,
                            null,
                            Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            } catch (Exception e) {
                // Invalid user ID or token
                System.out.println("Token validation failed or user not found: " + e.getMessage());
            }
        } else {
             if (userId != null) {
                 System.out.println("SecurityContext already has authentication: " + SecurityContextHolder.getContext().getAuthentication());
             }
        }

        filterChain.doFilter(request, response);
    }
}
