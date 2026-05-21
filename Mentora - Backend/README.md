
Advanced feature: Gamification system (Achievements page, Badges, Points, and Leaderboard)

Overview of the feature:
- My advanced feature is a gamification system that includes points, badges, reliability streaks for badges, and a leaderboard for both tutors and tutees. This feature rewards users for completing sessions and maintaining good attendance. It also provides recognition for consistent effort and positive behaviour of both tutors and tutees.
- The system is implemented across the backend and frontend and is tightly integrated with my session completion, and attendance tracking feature using the confirm attendance button before each confirmed tutoring session.

Research/reference:
https://stackoverflow.com/questions/5077357/how-to-design-a-rewards-system-on-my-website 

I researched how other developers design scalable badge and reward systems, a Stack Overflow discussion explained a common approach for implementing gamification features

The resource suggested:
- Storing badge definitions in a dedicated badge catalog
- Using a separate table to track which badges users have unlocked
- Triggering rewards based on user actions
- Using a central reward handler instead of hard-coding badge logic
- Keeping an audit trail of rewards and user actions

How this influenced my implementation:
- This resource helped guide my system design, my gamification feature follows similar principles
- Badges are stored in the Badge collection
- Unlocked badges are stored in UserAchievement
- All reward logic is centralised in rewardsService.js
- Rewards are triggered when a session becomes completed
- Points are tracked in both Users.points and PointsLedger for history and auditing

Why I chose this feature:
- I chose this feature to directly address Key Problem 3 from my proposal:
- frequent no-shows and last-minute cancellations leading to peer tutor fatigue and declining motivation.
- In peer tutoring, there is no accountability or structured recognition. Tutors often prepare materials and set aside time, only for sessions to be cancelled or missed by tutees. Over time, this causes frustration and burnout of the tutors.

By adding gamification, my system:
- Encourages tutees to attend sessions without cancelling last minute
- Rewards tutors for consistent effort
- Makes reliability and commitment of tutees visible for tutors to view
- Increases motivation for both tutors and tutees
This helps reduce unreliable behaviour and improves long-term engagement in my peer tutoring platform

How this improves the application:
- Increasing tutor motivation through recognition
- Encouraging tutees to attend sessions without cancelling last minute
- Reducing no-shows and last-minute cancellations
- Making commitment of both tutors and tutees recognised through badges and rankings
- Creating a sense of progress and achievement
- It turns attendance and reliability into measurable and rewarded behaviours

Link back to original problem:
- Key problem 3: Frequent no-shows and last-minute cancellations leading to peer tutor fatigue.
- By adding, points for completed sessions, earnable badges, achievements page, leaderboard ranking, attendance and completed sessions based rewards
- The system increases accountability and motivation
- Tutors feel more valued for their time and effort
- Tutees are encouraged to take sessions more seriously
- This helps reduce burnout and supports a more sustainable peer tutoring ecosystem

Tools and libraries used:
- Node.js and Express for backend logic
- MongoDB and Mongoose for data models

How this feature works:
1. Session completion triggers the reward system
- The gamification system is triggered when a peer tutoring session becomes completed
- In sessions.js, when a session is updated, the backend checks whether:
The session was not completed before and that the session is now completed

For example this line of code in sessions.js, ensures rewards are only given once per session

if (!wasCompleted && isNowCompleted) {
  await awardRewardsIfCompleted(updated._id);
}


2. Rewards Service
- All main gamification logic is handled in services/rewardsService.js
- This file is responsible for, awarding points, unlocking badges, calculating reliability streaks for reliability badges, preventing duplicate rewards

The main function is:
awardRewardsIfCompleted(sessionId)

This function:
- Confirms the session is completed
- Awards +10 points to both tutor and tutee
- Awards milestone bonus points +30 every 5 completed sessions
- Evaluates all badge rules
- Unlocks eligible badges
- Marks the session as rewardsAwarded to prevent duplicates


3. Backend schemas used in gamification
Users (User.js)
Stores:
- completedSessionsCount
- attendanceRate
- points
- badges (array of badgeKey strings)
Used to display profiles, sort the leaderboard, and support badge and streak calculations

Badge catalog (Badge.js)
- Stores all available badges in the system.

User Achievements (UserAchievement.js)
- Stores which badges a user has unlocked
- Prevents duplicate unlocks of badges and provides an audit trail

Points Ledger (PointsLedger.js)
- Stores a full transaction history of points
- Used for transparency, debugging, and displaying points history
- Users.points is used for leaderboard and fast reads
- PointsLedger is used for audit and history
- Both are updated together using safeAddPoints()


4. stats.js integration
- The gamification system depends on accurate completed session and attendance data
- The stats.js backend recalculates, attendanceRate, completedSessionsCount, cancelledSessionsCount

This ensures:
- Badge logic is based on correct data
- User profiles load quickly using precomputed values


5. Reliability streak logic
- Reliability badges are based on consecutive completed sessions

The logic:
- Counts completed sessions in order
- Breaks streak if the user cancels
- Ignores cancellations by the other user as they shouldnt be penalised
- This encourages responsible behaviour and discourages last-minute cancellations


6. Frontend Integration
- On the client side, the gamification system is displayed using:
TutorAchievementsPage, TuteeAchievementsPage, LeaderboardPodium (component), BadgeCard (component), PointsHistory (component)

These pages call:
- /achievements/summary
- /achievements/ledger
- /badges

The UI displays:
- User points
- Rank on leaderboard
- Earned and locked badges
- Progress bars for locked badges
- Recent points history
