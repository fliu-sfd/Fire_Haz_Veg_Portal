# Fire Hazardous Vegetation Portal

## Overview

A capstone project to digitize the Scottsdale Fire Department's hazardous
vegetation assessment workflow, replacing a paper-based inspection and
homeowner notification process with a web-based portal for hazard tracking,
photo verification, and resolution status.

## Sponsor

Scottsdale Fire Department: Michael Tobin and Franklin Liu

## Team

ASU MS Software Engineering Capstone, Team 4

Tejas Shah, Dhyey Patel, Ronak Radadiya, Kshitij Dumbre, Hruday Pabbisetty

## Status

Homeowners can:

- sign up, sign in and manage their own profile and password
- link their properties using the Asset ID on the door tag
- view the latest inspection of each property, with the crew's photos
- upload photos showing a hazard is fixed, and edit them while they wait for review
- request a full assessment of a property

Administrators can:

- see hazards on a map with state, crew, date, photo and attention filters
- review homeowner photos in an inbox and approve them or send them back with a reason
- manage users, their roles and their linked properties
- handle full assessment requests
- reword messages the portal shows, such as the disabled account message

The City's NAOS inspection file is loaded with an import command, which also runs when
the stack starts in Docker (see [`docs/database.md`](docs/database.md)).

## Tech Stack

- Backend: Python 3.11+ with FastAPI
- Database: PostgreSQL 16 + PostGIS (SQLAlchemy 2, Alembic), see [`docs/database.md`](docs/database.md)
- Frontend: Next.js App Router with React, TypeScript, and Tailwind CSS

Backend setup and development instructions are available in
[`backend/README.md`](backend/README.md).

Frontend setup and team conventions are available in
[`frontend/README.md`](frontend/README.md).

## Documentation

- [`docs/README.md`](docs/README.md): index of the project documentation
- [`docs/database.md`](docs/database.md): database guide, schema and data import
- [`docs/user-guides/README.md`](docs/user-guides/README.md): homeowner and administrator guides
- [`docs/testing/test-plan.md`](docs/testing/test-plan.md): test plan and system test scripts
- [`backend/README.md`](backend/README.md): backend code layout and API endpoints
