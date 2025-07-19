package com.devesh.spring.otpwithjwtauth.component;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "spring.mail")
public class AppProperties {

    private String username;
    private String password;

    // Correct getter for the 'username' field
    public String getUsername() {
        return username;
    }

    // Correct setter for the 'username' field
    public void setUsername(String username) {
        this.username = username;
    }

    // Standard getter for the 'password' field
    public String getPassword() {
        return password;
    }

    // Standard setter for the 'password' field
    public void setPassword(String password) {
        this.password = password;
    }
}