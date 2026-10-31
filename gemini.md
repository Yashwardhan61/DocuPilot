# DocuPilot - Project Guidelines & Global Agent Rules

## Overview
**DocuPilot** is a Notice-to-Action Agent for Students designed to process announcements, circulars, and notices into actionable tasks, reminders, and calendar events.

---

## Global AI Mandates & Development Rules
The following rules and workflows are mandatory and strictly enforced across all development and feature builds:

### 1. Pre-Implementation: Set Rules + Checklist Before You Start
- **Never code freely without an approved plan.**
- Before writing any implementation code, write clear project rules and a step-by-step checklist.
- Establish architectural boundaries, file changes, and acceptance criteria upfront.

### 2. Testing Hierarchy: Force Proper Testing from the Start (Strict TDD)
- **Unit Tests First (Non-Negotiable)**: Write unit tests *before* writing the actual feature code.
- **Integration Tests**: Add integration tests to validate cross-module communication and end-to-end workflows.
- **Follow Test-Driven Development (TDD)**:
  1. **Red**: Write tests that define the expected behavior and verify that they fail.
  2. **Green**: Write the minimal code necessary to make the tests pass.
  3. **Refactor**: Clean and optimize the code while keeping all tests passing.

### 3. Adversarial Review: Attack Your Own Work
- Once a feature is implemented and passes initial tests, immediately switch perspectives to an adversarial security / penetration tester.
- Actively attempt to break the feature: uncover edge cases, security vulnerabilities, injection vectors, concurrency issues, and failure points.
- **Report before fixing**: Compile and present an exhaustive list of all weaknesses, bugs, and improvement areas *first* before making fixes.

### 4. Concurrency & Load Testing
- Simulate thousands of simultaneous users using the application concurrently.
- Identify throughput bottlenecks, race conditions, memory leaks, high latency, and breaking points under stress.

### 5. Post-Testing Cleanup: Delete Test Files After Testing
- After full testing, verification, and adversarial reviews are complete and all tests pass, delete all temporary test files, load scripts, and testing suites.
- Keep the production repository clean and free of test clutter.

---

## Project Structure
- `DocuPilot/`: Application source code and assets.

## Tech Stack
*(To be defined / updated)*

## Key Guidelines
- Maintain modular, clean code adhering to the TDD mandates above.
- Keep documentation up to date with new modules, APIs, and workflows.

## Common Commands
*(To be updated as build and run scripts are added)*
