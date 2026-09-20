# Decision Log

> AI assistance disclosure: This document was refined with AI-assisted writing support for clarity and structure. The project decisions and implementation were made as part of the team’s development work.

## Project
PotholeWatch AI

## Purpose
This document records the major design, technical, and product decisions made during the development of the project. It helps explain why the solution was built the way it was and what trade-offs were accepted for a functional MVP.

---

## Decision 1: Build a citizen-first civic reporting workflow
### Decision
We designed the app around a simple reporting journey: citizen uploads photo + location + issue details.

### Why
- Easy for users to understand and use
- Improves the quality of complaint submission
- Makes the evidence more actionable for civic teams

### Impact
This creates a strong user experience and reduces the friction usually associated with civic reporting.

### Status
Implemented

---

## Decision 2: Use AI to verify image evidence before accepting a report
### Decision
The app uses AI models to decide whether an uploaded image clearly shows a supported civic issue.

### Why
- Reduces false or irrelevant submissions
- Helps validate real urban problems
- Improves trust in the reporting system

### Impact
The platform becomes more reliable by avoiding blind acceptance of unclear or unrelated images.

### Status
Implemented

---

## Decision 3: Add duplicate detection before creating a complaint
### Decision
Before finalizing a complaint, the system checks for similar issue types and nearby locations.

### Why
- Prevents multiple duplicate reports for the same problem
- Saves civic resources and time
- Makes complaint handling more efficient

### Impact
This makes the app more practical for real municipal workflows and reduces noise in the dataset.

### Status
Implemented

---

## Decision 4: Validate location data before routing complaints
### Decision
The application validates coordinates and checks whether the report falls within the configured Mysuru service area.

### Why
- Keeps the app realistic and scoped
- Reduces invalid or misplaced reports
- Improves routing confidence

### Impact
It ensures that issue routing is based on usable and relevant geographic information.

### Status
Implemented

---

## Decision 5: Keep the solution focused on Mysuru as a pilot city
### Decision
We scoped the project to Mysuru instead of building a generic all-city platform.

### Why
- Easier to validate the model and workflow
- More realistic for an MVP
- Aligns with the local civic problem context

### Impact
This reduces complexity while keeping the product relevant and demonstrable.

### Status
Implemented

---

## Decision 6: Use a public dashboard for transparency
### Decision
We included a public dashboard to display complaint information without exposing personal data.

### Why
- Increases accountability
- Makes citizens aware of civic issue visibility
- Promotes trust in the reporting process

### Impact
The system is not only a reporting tool but also a transparency layer for the city and residents.

### Status
Implemented

---

## Decision 7: Use Next.js + Supabase for rapid MVP development
### Decision
The project was built using Next.js, React, TypeScript, and Supabase.

### Why
- Fast development for a hackathon-style product
- Simple UI and API handling
- Easy data persistence and retrieval
- Suitable for prototype deployment

### Impact
This architecture enables quick iteration and clear demonstration of the core concept.

### Status
Implemented

---

## Decision 8: Keep the project as an MVP, not a full government system
### Decision
The project is intentionally designed as a prototype and not as a fully deployed official municipal system.

### Why
- Scope is realistic for the timeframe
- Legal and civic integration requirements are broader than the MVP
- Focus remains on demonstrating value and feasibility

### Impact
The app clearly communicates the concept while staying practical and credible.

### Status
Implemented

---

## Final notes
This project demonstrates how AI, civic data, and a citizen-facing workflow can improve how urban issues are reported, verified, tracked, and resolved. The decisions above were chosen to maximize clarity, usability, and practical value within the constraints of an MVP.
