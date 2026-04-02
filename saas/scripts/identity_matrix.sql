-- Sovereign Identity Reconciliation
UPDATE tc_users 
SET email = 'admin@traccar.com', 
    login = 'admin', 
    hashedpassword = (SELECT hashedpassword FROM tc_users WHERE email = 'client_1@traccar.test' LIMIT 1), 
    salt = (SELECT salt FROM tc_users WHERE email = 'client_1@traccar.test' LIMIT 1) 
WHERE id = 1;
