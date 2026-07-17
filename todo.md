# Golf Trip App — TODO

## Phase 1: Database Schema
- [x] trips table (name, dates, handicap config: baseline, factor, mode)
- [x] trip_players table (userId, tripId, startingHandicap, currentHandicap)
- [x] rounds table (tripId, name, date, courseId, formats: strokePlay/4BBB/skins enabled)
- [x] groups table (roundId, name)
- [x] group_players table (groupId, playerId, partnerId for 4BBB)
- [x] holes table (courseId, holeNumber, par, strokeIndex)
- [x] courses table (name, holes)
- [x] scores table (roundId, playerId, holeId, grossScore, netScore, stablefordPoints)
- [x] achievements table (roundId, playerId, holeId, type: HIO/Eagle/Birdie, confirmed)
- [x] notifications table (tripId, message, type, createdAt)
- [x] handicap_history table (tripId, playerId, roundId, oldHcp, newHcp, reason, isManual)
- [x] side_matches table (groupId, roundId, type, status)
- [x] side_match_players table (sideMatchId, playerId, partnerId)

## Phase 2: Backend API (tRPC Routers)
- [x] trips router: create, get, list, update
- [x] players router: add to trip, list, update handicap
- [x] rounds router: create, get, list, update formats
- [x] groups router: create, assign players, set partners
- [x] courses router: create course with holes
- [x] scores router: submitHoleScore, getScorecard
- [x] achievements router: detect, verify, broadcast
- [x] handicap router: recalculate after round, manual override, history log
- [x] leaderboard router: daily (by round), trip (cumulative)
- [x] notifications router: list, mark read
- [x] sideMatches router: create, update, get status

## Phase 3: Admin Panel
- [x] Admin layout with sidebar navigation
- [x] Trip Setup page (create/edit trip, dates, course)
- [x] Competition Format Config page (enable Stroke Play / 4BBB / Skins per round)
- [x] Participant Management page (add/remove players, set starting handicaps)
- [x] Group Creation page (create groups, assign players, set 4BBB partners)
- [x] Round Scheduling page (create rounds, set date/course/formats)
- [x] Handicap Config page (set baseline score, adjustment factor, scoring mode)
- [x] Handicap History log page (view all adjustments)
- [x] Manual Handicap Override UI

## Phase 4: Score Entry
- [x] Score Entry page (hole-by-hole input per player)
- [x] Achievement detection logic (HIO / Eagle / Birdie vs par)
- [x] Mandatory verification dialog before committing notable scores
- [x] Broadcast notification on confirmed achievement
- [x] Net score and Stableford points auto-calculation
- [x] 4BBB best-ball calculation per hole
- [x] Skins lowest-unique-score calculation per hole

## Phase 5: Leaderboards
- [x] Daily Leaderboard page (Stroke Play, 4BBB, Skins tabs)
- [x] Trip Leaderboard page (cumulative across all rounds)
- [x] Round-by-round drill-down view on trip leaderboard
- [x] Real-time refresh (polling every 15–30 seconds)

## Phase 6: Side Matches & Notifications
- [x] Side Match selection UI (groups choose their side game)
- [x] Side Match scoring tied to partner
- [x] In-app notification feed (achievement broadcasts)
- [x] Achievement notification banner/toast

## Phase 7: Polish & Tests
- [x] Global theming (dark golf-green palette, clean typography)
- [x] Mobile-responsive layouts
- [x] Vitest unit tests: handicap calculation, skins logic, achievement detection (27 tests passing)
- [x] Empty states, loading skeletons
- [x] Final checkpoint and delivery
