package com.transcendance.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.transcendance.backend.model.UserRole;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Long>{
    
}
