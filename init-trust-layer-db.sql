-- Create the trust_layer database for the Trust Layer service.
-- This runs once on first Postgres startup via docker-entrypoint-initdb.d.
SELECT 'CREATE DATABASE trust_layer OWNER coalition'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'trust_layer')\gexec
