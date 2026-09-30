# Data

Sample data from the Scottsdale Fire Department.

## File

`Community_NAOS_Inspections.gdb.zip` is a zipped Esri File Geodatabase. It is kept zipped in the repo.

## The data

- **Hazardous_Vegetation_Community_NAOS** (points): 7,040 inspections of community NAOS areas
  - `sfd_status`: 145 `ISSUES`, 6,895 `NO ISSUES`
  - `photo_taken`: 108 `YES`, 37 `NO` (only filled in for `ISSUES` records)
  - `comments`: filled in for 140 records
  - `site_address`: filled in for only 9 records, so location comes from the point geometry
  - `sfd_edit_date`: May 9 – June 24, 2026
- **Hazardous_Vegetation_Community_NAOS__ATTACH**: 136 JPEG photos for 108 records, linked by `REL_GLOBALID` = `GlobalID`
- Coordinates are in EPSG:2868 (Arizona Central State Plane, feet) and need converting to lat/long (EPSG:4326) for a web map.
- These fields are empty in every record: `safety_zone_30_ft`, `trim_trees_and_branches`, `flammable_items`, `clear_gutters_leaves`, `schedule_safety_inspection`, `door_tag`, `NAOS`

