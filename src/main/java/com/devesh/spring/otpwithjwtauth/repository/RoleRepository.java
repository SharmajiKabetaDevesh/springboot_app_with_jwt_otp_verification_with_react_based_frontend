package com.devesh.spring.otpwithjwtauth.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.devesh.spring.otpwithjwtauth.models.ERole;
import com.devesh.spring.otpwithjwtauth.models.Role;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
  Optional<Role> findByName(ERole name);
}
