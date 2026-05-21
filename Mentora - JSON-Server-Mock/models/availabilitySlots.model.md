# Model: availabilitySlots

## Description
Stores individual date and time slots that tutors mark as available for tutoring.  
Each document represents one specific date and start time that a tutor has opened for booking.  
Slots are linked to sessions once booked, enabling a clear and structured scheduling system.

## Usage in App
- Used to render tutor availability in the “Book now” pop-up form
- Allows tutees to see exactly when a tutor is free
- Prevents double-booking by marking slots as booked
- Links directly to a session once booked
- Helps tutors manage availability without manual messaging

---

## Field Groups (for clarity)

### A) Core Slot Fields (REQUIRED)
- `id` (Number) — JSON-server primary key
- `_id` (String) — placeholder for MongoDB `_id`
- `tutorId` (String) — references users._id (tutor)
- `slotDate` (ISO String) — calendar date of availability (e.g. 2025-09-05)
- `timeRange` (String) — session time range (e.g "4:00 pm - 5:00 pm")
- `status` ("open" | "booked" | "past")
- `createdAt` (ISO String)
- `updatedAt` (ISO String)

---

### B) Booking Linkage
- `sessionId` (String | null) — references sessions._id once booked

Notes:
- If `status` = "open", then `sessionId` must be null
- If `status` = "booked", then `sessionId` must reference a valid session
- If the session is cancelled, the slot may:
  - return to `status = "open"` OR
  - be marked as `status = "past"` depending on business rules
