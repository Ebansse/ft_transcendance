INSERT INTO roles (role_name, description)
VALUES
('USER', 'Default user role'),
('ADMIN', 'Administrator role')
ON CONFLICT (role_name) DO NOTHING;