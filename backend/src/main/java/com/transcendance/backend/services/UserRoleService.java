package com.transcendance.backend.services;

import java.util.List;

import org.apache.logging.log4j.Logger;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import com.transcendance.backend.model.Role;
import com.transcendance.backend.model.User;
import com.transcendance.backend.model.UserRole;
import com.transcendance.backend.repository.RoleRepository;
import com.transcendance.backend.repository.UserRoleRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserRoleService {

    private static final Logger log = org.apache.logging.log4j.LogManager.getLogger(UserRoleService.class);

    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;

    /**
     * Assign the default USER role to a user.
     *
     * @param user the user to assign the role to
     * @throws RuntimeException if the USER role does not exist
     */
    public void assignRoleUserToNewUser(User user) {
        // Fetch the USER role from the database
        Role role = roleRepository.findByRoleName("USER")
                .orElseThrow(() ->
                        new RuntimeException("Default role 'USER' not found."));

        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(role);

        userRoleRepository.save(userRole);
        log.info("Assigned role 'USER' to user with email: {}", user.getEmail());
    }

    /**
     * Get the roles assigned to a user.
     *
     * @param user the user for which to retrieve roles
     * @return a list of granted authorities representing the user's roles
     */
    public List<SimpleGrantedAuthority> getRoleUser(User user) {
    return userRoleRepository.findByUser(user)
        .stream()
        .map(userRole -> new SimpleGrantedAuthority(
            "ROLE_" + userRole.getRole().getRoleName()
        ))
        .toList();
    }
}
