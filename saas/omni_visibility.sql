-- Omni-Visibility Activation Proxy
-- Structure: Grant Admin (ID 1) the visibility permissions for ALL devices in the system.

INSERT INTO tc_user_device (userid, deviceid)
SELECT 1, id FROM tc_devices
ON CONFLICT DO NOTHING;

-- Also ensure the admin has 'Super-Admin' status active
UPDATE tc_users SET administrator = true WHERE id = 1;
