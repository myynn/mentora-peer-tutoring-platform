# Model: sessions

## Description
Represents each peer tutoring session between a tutor and a tutee.  
Each document captures the full lifecycle of a session — from booking request, confirmation, attendance tracking, to post-session summary and reflection.

## Usage in App
- Created when a tutee books a tutor
- Used to generate tutor and tutee schedules
- Powers tabs such as:
  - Tutor: My Schedule, Confirm Sessions, History
  - Tutee: My Booked Sessions, History
- Manages session states (pending, confirmed, cancelled)
- Tracks attendance confirmation
- Stores lesson objectives, preparation details, and post-session summaries

---

## Field Groups (for clarity)

### A) Core Session Fields (REQUIRED)
- `id` (Number) — JSON-server primary key
- `_id` (String) — placeholder for MongoDB `_id`
- `tutorId` (String) — references users._id (tutor)
- `tuteeId` (String) — references users._id (tutee)
- `sessionDate` (ISO String) — scheduled date of the session
- `sessionTimeRange` (String) — stores the selected session time range (e.g. "12:00 PM - 1:00 PM"), displayed on session cards, schedules, and history
- `status` ("pending" | "confirmed" | "cancelled")
- `createdAt` (ISO String)
- `updatedAt` (ISO String)

---

### B) Cancellation & Attendance Tracking
- `cancelledBy` ("tutor" | "tutee" | null)

- `attendance` (Object)
  - `tutorConfirmed` (Boolean)
  - `tuteeConfirmed` (Boolean)

Notes:
- If status = "cancelled" AND cancelledBy = "tutee", increment tutee.cancelledSessionsCount
- If tutorConfirmed = true, cancelledBy cannot be "tutor"
- If tuteeConfirmed = true, cancelledBy cannot be "tutee"

---

### C) Pre-Session Details (TUTEE input)
**Stored under `preSession` object**
- `objectives` (String)
- `questions` (String[])
- `difficulties` (String)

Used by tutors to prepare before the session.

---

### D) Pre-Session Checklist (TUTOR input)
**Stored under `checklist` array**
Each item:
- `id` (String)
- `item` (String)
- `isDone` (Boolean)

Example:
```json
{
  "id": "chk_001",
  "item": "Read Chapter 5",
  "isDone": true
}
