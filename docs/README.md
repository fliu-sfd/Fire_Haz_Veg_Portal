# Documentation

This folder holds meeting notes, requirements documents, and sponsor
communication relevant to the project.

## Project requirements

The [project scope and requirements](requirements/project-scope.md) define the
portal's purpose, users, functional and non-functional requirements, limits,
assumptions, exclusions, and Taiga traceability.

## User guides

The [user guide index](user-guides/README.md) links to the homeowner and
administrator guides. The guides cover story #51, with written drafts from task #75 and dated screen
captures and validation results from task #76. The index records remaining release
and teammate-review checks.

## Testing

The [test plan](testing/test-plan.md) lists what is tested, how to run each kind of test and
the results of the last full run (task #49). The [system test scripts](testing/system-test-scripts.md)
are step-by-step browser checks for homeowners and administrators, with the seed data
(`testing/system-test-seed.sql`) and an automated runner (`testing/run_system_tests.py`).

## Theory of operations

The [Theory of operations](requirements/theory-of-operations.md) explains the
architecture, shared terms, data and photo workflows, access checks, startup,
configuration, backup and recovery, and City IT handover for task #84. It also
cross-references the companion scope and requirements draft in PR #45.
