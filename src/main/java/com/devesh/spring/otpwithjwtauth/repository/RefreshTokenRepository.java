package com.devesh.spring.otpwithjwtauth.repository;

import com.devesh.spring.otpwithjwtauth.models.RefreshToken;
import com.devesh.spring.otpwithjwtauth.models.User;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);

    @Modifying
    int deleteByUser(User user);

    @Modifying
    @Transactional
    void deleteByToken(String token);
}