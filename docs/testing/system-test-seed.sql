-- System test seed data (task #49)
-- Author: Tejas Shah
--
-- Four made-up 2026 inspection results so the system test scripts can run without
-- the City's NAOS file. The Asset IDs (9000001-9000004), addresses and notes are
-- invented. Nothing here comes from sponsor data.
--
--   9000001  two ISSUES points                      (used for the full review cycle)
--   9000002  one ISSUES point + one NO ISSUES point (closes when its one issue is approved)
--   9000003  one NO ISSUES point                    (never needs photos)
--   9000004  one ISSUES point                       (never linked; proves other homes stay hidden)
--
-- Run it once against an empty database that already has the migrations applied:
--   psql -h localhost -U fhv -d fire_hazard_veg -f docs/testing/system-test-seed.sql
-- Running it twice adds every row a second time, so reset the database first.

INSERT INTO assessments
    (season_year, source_global_id, asset_id, status, comments, crew_code, inspected_at,
     site_address, site_type, inspection_type, location)
VALUES
    (2026, gen_random_uuid(), '9000001', 'ISSUES', 'Dead brush along the north fence', 'C1', now(),
     '100 Test Canyon Rd', 'Residential', 'Initial', ST_SetSRID(ST_MakePoint(-111.9100, 33.6010), 4326)),
    (2026, gen_random_uuid(), '9000001', 'ISSUES', 'Overhanging limbs near the roof', 'C1', now(),
     '100 Test Canyon Rd', 'Residential', 'Initial', ST_SetSRID(ST_MakePoint(-111.9101, 33.6011), 4326)),
    (2026, gen_random_uuid(), '9000002', 'ISSUES', 'Woodpile against the house', 'C2', now(),
     '200 Test Ridge Ln', 'Residential', 'Initial', ST_SetSRID(ST_MakePoint(-111.9200, 33.5900), 4326)),
    (2026, gen_random_uuid(), '9000002', 'NO ISSUES', NULL, 'C2', now(),
     '200 Test Ridge Ln', 'Residential', 'Initial', ST_SetSRID(ST_MakePoint(-111.9201, 33.5901), 4326)),
    (2026, gen_random_uuid(), '9000003', 'NO ISSUES', NULL, 'C3', now(),
     '300 Test Clean Ct', 'Residential', 'Initial', ST_SetSRID(ST_MakePoint(-111.9300, 33.6100), 4326)),
    (2026, gen_random_uuid(), '9000004', 'ISSUES', 'Dry grass over 6 inches', 'C2', now(),
     '400 Test Mesa Pl', 'Residential', 'Initial', ST_SetSRID(ST_MakePoint(-111.9050, 33.5800), 4326));
