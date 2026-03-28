-- Create saas schema if not exists
CREATE SCHEMA IF NOT EXISTS saas;

-- Traccar usually uses the public schema, but we ensure it's there
-- The geosurepath database itself is created by the environment variable POSTGRES_DB
