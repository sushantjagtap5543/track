-- Repaired Identity Mapping
UPDATE tc_users 
SET email = 'admin@geosurepath.com', 
    hashedpassword = '9f4a8b7c2e1d0f5e7a9b3c4d6e8f', 
    salt = '00000000000000000000000000000000' 
WHERE administrator = true;

-- Relational Permission Sync (Ensuring Admin sees ALL devices)
INSERT INTO tc_user_device (userid, deviceid)
SELECT u.id, d.id 
FROM tc_users u, tc_devices d 
WHERE u.administrator = true
ON CONFLICT DO NOTHING;
