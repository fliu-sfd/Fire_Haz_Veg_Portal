# Contributing Guide

This document outlines the workflow and conventions for contributing to
this repository.

## Branching Strategy

- `main`: Production-ready branch. Protected. No direct commits.
- `dev`: Integration branch. All completed features are merged here first.
- `feature/<short-description>`: Individual feature or task branches created
  from `dev`.
- `fix/<short-description>`: Bug-fix branches created from `dev`.

Example branch names:

```text
feature/homeowner-notification-form
fix/csv-parser-encoding-error
```

## Workflow

1. Pull the latest `dev` branch before starting new work.
2. Create a new branch from `dev` using the naming convention above.
3. Commit changes in small, logical increments.
4. Push the branch and open a pull request into `dev`.
5. Request at least one review from a teammate before merging.
6. Once approved, use squash and merge to keep the history clean.
7. Delete the feature branch after merging.
8. Merge `dev` into `main` at agreed sprint milestones.

## Commit Message Convention

This project follows a simplified version of Conventional Commits.

Format:

```text
<type>: <short description>
```

Common types:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `chore`: Maintenance tasks, configuration, or dependency updates
- `refactor`: Code changes that do not add features or fix bugs

Examples:

```text
feat: add photo upload for hazard reports
fix: correct date parsing in inspection log
docs: update README with setup instructions
```

## Pull Requests

- Keep pull requests focused on a single feature or fix.
- Include a short description of what changed and why.
- Link any related task or user story from the project board.
- Ensure the branch builds and runs locally before requesting review.

## Code Reviews

- At least one approval is required before merging into `dev`.
- Reviewers should check for correctness, readability, and consistency with
  the existing code style.
- Address review comments with new commits rather than force-pushing unless
  specifically requested.

## Issues and Task Tracking

Tasks and user stories are tracked in Taiga. Reference the relevant task or
user story ID in commit messages or pull request descriptions where applicable.
