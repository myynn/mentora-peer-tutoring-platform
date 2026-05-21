# Model: users

## Description
Stores all user accounts for Mentora, including both roles (tutor and tutee).  
Includes login info (username/email/password), role-based profile details, and credibility/reliability stats used across the platform.

## Usage in App
- Registration + login
- Role-based routing (tutor portal vs tutee portal)
- Tutor discovery: search/filter by modules, availability, rating, teaching style
- Credibility indicators: rating, completed sessions, completion/attendance rate, badges
- Reliability indicators: tutee cancellations and warnings

---

## Field Groups (for clarity)

### A) Core Account Fields (BOTH users)
**Required**
- `id` (Number) — JSON-server primary key
- `username` (String) — unique, required
- `email` (String) — unique, required
- `password` (String) — required (MVP plain text; later hashed)
- `role` ("tutor" | "tutee") — required
- `schoolName` (String) — required
- `availableDays` (String[]) — required
- `createdAt` (ISO String) — required
- `updatedAt` (ISO String) — required

---

### B) Tutor Profile Fields (TUTOR only)
**Stored under `tutorProfile` object**
**Required for tutors**
- `yearLevelsToTeach` (String[])
- `modulesAbleToTeach` (String[])
- `shortBio` (String)
- `teachingStyle` ("Visual" | "Step-by-step" | "Discussion-based")
- `descriptionTeachApproach` (String)
- `sessionDurationMinutes` (Number[]) — e.g. [30, 60]

**Optional**
- `gpa` (Number | null)

---

### C) Tutee Profile Fields (TUTEE only)
**Stored under `tuteeProfile` object**
**Required for tutees**
- `yearOfStudy` (String)
- `modulesNeedHelpWith` (String[])
- `learningStyle` ("Visual" | "Step-by-step" | "Discussion-based")

---

### D) Stats Fields (role-dependent)
**Stored under `stats` object**

#### Tutor credibility stats (TUTOR only)
- `averageRating` (Number)
- `totalRatings` (Number)
- `completedSessionsCount` (Number)
- `completionRate` (Number) — % confirmed/completed as tutor

#### Tutee reliability stats (TUTEE only)
- `completedSessionsCount` (Number)
- `attendanceRate` (Number) — % attended as tutee
- `cancelledSessionsCount` (Number) — only when cancelledBy="tutee"
- `lastWarningAt` (Number) — 0,3,6,... threshold already warned
