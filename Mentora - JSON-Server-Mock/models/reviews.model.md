# Model: reviews

## Description
Stores post-session feedback that tutees give to tutors.  
Each review includes the session reference, tutor/tutee references, a star rating (1–5), and a short comment.  
Used to measure tutor quality and credibility over time.

## Usage in App
- Created after a completed session when the tutee submits a rating/review
- Displayed on tutor profiles (expanded view)
- Displayed on tutor detail cards (average rating + total reviews)
- Used to compute tutor credibility metrics:
  - `users.stats.averageRating`
  - `users.stats.totalRatings`

---

## Field Groups (for clarity)

### A) Core Review Fields (REQUIRED)
- `id` (Number) — JSON-server primary key
- `_id` (String) — placeholder for MongoDB `_id`
- `sessionId` (String) — references sessions._id (recommended for traceability)
- `tutorId` (String) — references users._id (tutor)
- `tuteeId` (String) — references users._id (tutee)
- `rating` (Number) — integer 1 to 5
- `comment` (String)
- `createdAt` (ISO String)


