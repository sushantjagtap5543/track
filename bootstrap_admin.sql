INSERT INTO public.tc_users (name, email, hashedpassword, salt, administrator, readonly, disabled) 
VALUES ('GeoSurePath Admin', 'admin@geosurepath.com', '1234567890abcdef', '1234567890abcdef', true, false, false) 
ON CONFLICT (email) DO UPDATE SET administrator = true, disabled = false;
