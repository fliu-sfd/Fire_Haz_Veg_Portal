-- Runs once, the first time the Postgres volume is created.
-- The postgis image already enables PostGIS on the default database;
-- these are kept here so a plain Postgres install can be set up the same way.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid() for public QR tokens

-- Separate database for running the backend test suite.
SELECT 'CREATE DATABASE fire_hazard_veg_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fire_hazard_veg_test')\gexec

\connect fire_hazard_veg_test
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
