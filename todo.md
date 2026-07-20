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

## Phase 8 — New Features (Match Play, Alt Shot, PDF Export, Chat)

- [x] Extend DB schema: add matchplay_results table, extend rounds.format enum to include matchPlay and alternateShot
- [x] Backend: Match Play scoring engine — hole-by-hole win/loss/halve, running match status (X Up / AS / X Down), match result
- [x] Backend: Alternate Shot scoring engine — shared ball, alternating shots, combined handicap allowance
- [x] Frontend: Match Play score entry — per-hole result selector, live match status banner
- [x] Frontend: Match Play leaderboard — match status for all pairings via getByRound
- [x] Frontend: Alternate Shot score entry — combined handicap calculation, tee player alternation
- [x] Frontend: Alternate Shot leaderboard — net score ranking for pairs (via standard score entry)
- [x] Admin: Add matchPlay and alternateShot to round format selector
- [x] PDF Export: End-of-round scorecard PDF per player/group
- [x] PDF Export: End-of-trip results PDF (full leaderboard + achievement log)
- [x] PDF Export: Download button on Daily and Trip Leaderboard pages
- [x] In-App Chat: trip_messages DB table (tripId, userId, message, timestamp)
- [x] In-App Chat: tRPC procedures — sendMessage, getMessages (paginated), real-time polling
- [x] In-App Chat: Chat UI — message thread, input box, sender name, timestamps
- [x] In-App Chat: Unread message badge on nav — deferred to future enhancement (requires persistent session state)
- [x] In-App Chat: Link from Trip Dashboard

## Phase 9 — Progressive Web App (PWA)

- [x] Generate app icons (192x192 and 512x512 PNG) for the home screen
- [x] Write web app manifest (manifest.json) with name, icons, theme colour, display mode
- [x] Write service worker (sw.js) with offline fallback page
- [x] Register service worker in main.tsx
- [x] Link manifest in client/index.html with Apple touch icon meta tags
- [x] Add in-app install prompt banner (beforeinstallprompt) — Android + iOS instructions
- [x] Verify PWA criteria: HTTPS, manifest, service worker, icons
- [x] Checkpoint and deliver

## Phase 10 — Player Invite System

- [x] Extend DB schema: trip_invites table (id, tripId, email, name, token, status, expiresAt, createdAt)
- [x] Backend: generate unique invite token per player per trip
- [x] Backend: trip-level shareable link (single token for whole trip, no email required)
- [x] Backend: email invite dispatch using built-in notification/email API
- [x] Backend: join-via-token handler — validates token, creates/links user account, adds to trip_players
- [x] Backend: tRPC procedures — createInvite, listInvites, resendInvite, revokeInvite, joinViaToken
- [x] Admin UI: Roster page — add players by name + email, view invite status (pending/accepted/revoked)
- [x] Admin UI: Copy shareable trip link button
- [x] Admin UI: Send invite email button per player, resend and revoke actions
- [x] Player UI: /join/:token landing page — shows trip name, player name, Login to Join CTA
- [x] Player UI: Auto-join trip after OAuth login when token is in session
- [x] Player UI: Welcome confirmation screen after joining
- [x] Tests and checkpoint

## Session - Player Layout Fix & Nickname Feature

- [x] Fix AdminRoster player row layout: full name visible, HCP not overlapping buttons
- [x] Add `nickname` column to `trip_players` DB table (nullable varchar 64)
- [x] Apply DB migration via webdev_execute_sql
- [x] Add `players.setNickname` tRPC procedure (protectedProcedure)
- [x] Add nickname input on JoinTrip success screen
- [x] Update db.ts helpers to return nickname ?? name as displayName
- [x] Display nickname in leaderboards, score entry, chat, and roster

## Session - Handicap Enhancements

- [x] Show active baseline on Handicap History tab
- [x] Add validation note for existing trips with unconfigured baseline
- [x] DB: add dailyAdjustment (float, default 0) column to rounds table
- [x] Apply DB migration for dailyAdjustment
- [x] Backend: rounds.update accepts dailyAdjustment field
- [x] Backend: handicap recalculation chains from previous round's handicap (not initial)
- [x] Backend: dailyAdjustment applied before formula (shifts effective baseline)
- [x] Admin UI: per-round daily adjustment input on AdminHandicap settings tab
- [x] Player UI: /trip/:tripId/my-handicap page — initial HCP + per-round dynamic HCP journey
- [x] Link to my-handicap page from TripDashboard or Players page

## Session - Alerts, NTP & UX Improvements

- [x] Add My Handicap Journey shortcut card on Trip Dashboard
- [x] Show effective baseline on Daily Leaderboard header
- [x] Add Edit Nickname button on My Handicap Journey page
- [x] DB: nearest_to_pin table (id, roundId, holeId, holeNumber, enabled, winnerId, distanceCm, createdAt)
- [x] DB: ntp_entries table (id, ntpId, userId, distanceCm, submittedAt)
- [x] Apply DB migration for NTP tables
- [x] Backend: ntp.setHoles (admin) — enable/disable NTP per hole for a round
- [x] Backend: ntp.submitEntry (player) — submit distance in cm
- [x] Backend: ntp.getByRound — list all NTP holes + current leader per hole
- [x] Backend: ntp.setWinner (admin) — confirm winner for a hole
- [x] Admin UI: NTP hole selector on AdminGroups or AdminRounds (toggle per hole, set winner)
- [x] Player UI: NTP entry form on ScoreEntry (cm input appears inline for NTP-enabled holes)
- [x] Player UI: NTP results view (entries sorted by distance, current leader highlighted)
- [x] Eagle/Birdie/HIO: verify detection + broadcast notification already works
- [x] Eagle/Birdie/HIO: add real-time alert banner visible to all players in the trip (polling-based)
- [x] Eagle/Birdie/HIO: show achievement feed on Trip Dashboard / Notification Feed

## Session - Pairing System & Group 4BBB Matchplay

- [x] DB: add pairId (nullable int) to group_players table
- [x] DB: add group_matches table (id, roundId, groupId, pairAPlayer1Id, pairAPlayer2Id, pairBPlayer1Id, pairBPlayer2Id, status, result, createdAt)
- [x] Apply DB migration for pairing tables
- [x] Backend: groups.setPair (admin) — assign pairId to two players in a group
- [x] Backend: groups.selfPair (player) — player selects their partner from same group
- [x] Backend: groups.lockPairs (admin) — lock pairs and auto-create group_match record
- [x] Backend: groups.getMyGroup — return current user's group, partner, and opponents in a round
- [x] Backend: groupMatch.getByRound — list all group matches with hole-by-hole 4BBB Stableford Matchplay status
- [x] Backend: groupMatch.calculate — compute running matchplay status from scores
- [x] ScoreEntry: show partner's scorecard (scorer enters partner's scores, not own)
- [x] ScoreEntry: show live group match status panel alongside partner card
- [x] Admin UI: pair assignment in AdminGroups — select pairs per group, lock pairs button
- [x] Player UI: self-pairing screen — player picks partner from group members
- [x] Side Matches UI: group match result card showing hole-by-hole 4BBB matchplay
- [x] Main leaderboard: 4BBB score = best Stableford of pair (not matchplay result)
- [x] Tests and checkpoint

## Session - Group Management Improvements

- [x] Backend: removePlayerFromGroup procedure (removes from group_players, frees them for other groups)
- [x] Backend: addPlayerToGroup validates player not already in another group for same round
- [x] Backend: autoGroup procedure — randomise groups + pairs with lowest/highest HCP bias
- [x] Frontend: AdminGroups player selector filters out already-assigned players across all groups
- [x] Frontend: AdminGroups remove player button per player row (frees them back to available pool)
- [x] Frontend: AdminGroups Auto-Group button with group count input and confirm dialog
- [x] Tests and checkpoint

## Session - Trip/Round Management & Test Data

- [x] Backend: trips.delete procedure (only if status is upcoming or completed, cascade delete rounds/groups/players)
- [x] Backend: trips.update procedure (edit name, dates, description, location)
- [x] Backend: rounds.update procedure (edit name, date, course, format, scoring type, status)
- [x] Admin UI: Delete Trip button on AdminTrip with typed confirmation dialog (type DELETE to confirm)
- [x] Admin UI: Edit Trip dialog on AdminTrip (name, dates)
- [x] Admin UI: Edit Round dialog on AdminRounds (all round fields editable at any time)
- [x] Admin UI: Remove player from group mid-round (already exists, verify it works)
- [x] Admin UI: Unlock pairs button in AdminGroups (allow re-pairing after lock)
- [x] Seed: 2 new test trips with 16 randomised players each (Sunshine Coast Classic + Hunter Valley Open)
- [x] Tests and checkpoint

## Session - Unlock Pairs, Trip Location/Description, Copy Invite Link

- [x] DB: add location (varchar 255, nullable) and description (text, nullable) to trips table
- [x] Apply DB migration for trips location/description
- [x] Backend: groups.unlockPairs procedure (admin only, clears pairsLocked flag)
- [x] Backend: trips.create and trips.update accept location and description fields
- [x] Admin UI: Unlock Pairs button in AdminGroups (visible when pairs are locked)
- [x] Admin UI: location and description fields in Create Trip and Edit Trip dialogs
- [x] Admin UI: Copy Invite Link button on each trip card in AdminTrips
- [x] Home: Copy Invite Link shortcut on trip cards for admin users
- [x] Tests and checkpoint

## Session - Share Link Revoke, Trip Description on Dashboard, Handicap on Join

- [x] Backend: trips.revokeShareLink procedure (admin only, clears shareToken so old links stop working)
- [x] Admin UI: Revoke/Regenerate Share Link button in AdminTrips (next to Copy Invite, shown after first copy)
- [x] Player UI: Show trip description on TripDashboard (below trip name/dates if set)
- [x] Player UI: Starting handicap input on JoinTripShare success screen (player sets own HCP, updates trip_players)
- [x] Tests and checkpoint

## Session - Handicaps on Group Cards + Tee Time/Starting Hole per Group

- [x] DB: add teeTime (varchar 10, nullable) and startingHole (int, nullable) columns to groups table
- [x] Apply DB migration for groups teeTime and startingHole
- [x] Backend: getGroupPlayers includes currentHandicap from trip_players
- [x] Backend: groups.update procedure (admin only) to set teeTime and startingHole
- [x] Admin UI: show handicap next to each player name on group player chips in AdminGroups
- [x] Admin UI: tee time and starting hole inputs on each group card in AdminGroups
- [x] Tests and checkpoint

## Session - Score Entry Overhaul (Hole-by-Hole Mode)

- [x] Score page: hole-by-hole mode with ± buttons, hole number nav (prev/next), par/distance display
- [x] Score page: open on group's assigned starting hole (from groups.startingHole)
- [x] Score page: scorer can enter scores for partner as well as themselves
- [x] Score page: Par and Pick Up quick-select shortcuts per player per hole
- [x] Score page: show Shots, Points, Total running totals per player
- [x] Score page: mode toggle between hole-by-hole and existing all-holes grid
- [x] Score page: mismatch detection on submit — warn user which holes have conflicting scores between scorer and partner's entries
- [x] Tests and checkpoint

## Session - Co-Admin Assignment

- [x] DB: add isCoAdmin (boolean, default false) column to trip_players table
- [x] Apply DB migration for isCoAdmin
- [x] Backend: players.setCoAdmin procedure (trip owner only, max 4 co-admins per trip)
- [x] Backend: expose isCoAdmin in players.tripPlayers response
- [x] Backend: update trip-level admin checks to allow co-admins (isCoAdmin = true)
- [x] Admin UI: Co-Admin toggle button per player on Admin Players page (owner only)
- [x] Admin UI: show Co-Admin badge on player rows; disable toggle when 4 already assigned
- [x] Tests and checkpoint

## Session - Co-Admin Access, Notification & Tee Sheet

- [x] Backend: trip-scoped admin guard (tripAdminProcedure) that allows global admin OR co-admin for that trip
- [x] Backend: apply tripAdminProcedure to groups, rounds, scoring, NTP, and side-match procedures
- [x] Backend: send in-app notification to player when they are promoted to co-admin
- [x] Backend: rounds.getTeeSheet procedure — returns all groups for a round sorted by teeTime, with players + handicaps
- [x] Frontend: co-admin users see Admin Panel button on home screen for their trips
- [x] Frontend: co-admin users can navigate to admin pages (Groups, Rounds, Players) for their trips
- [x] Frontend: new TeeSheet page at /trip/:tripId/round/:roundId/teesheet — read-only, shareable
- [x] Frontend: link to Tee Sheet from TripDashboard and AdminGroups
- [x] Tests and checkpoint

## Session - Co-Admin Scope, PDF Tee Sheet, Past Round Tee Sheets

- [x] Backend: add isCoAdminForTrip(userId, tripId) helper to db.ts
- [x] Backend: AdminPlayers page — redirect non-admin, non-coAdmin users away from /admin/trips/:tripId/players
- [x] Backend: AdminRounds page — redirect non-admin, non-coAdmin users away from /admin/trips/:tripId/rounds
- [x] Backend: AdminGroups page — redirect non-admin, non-coAdmin users away from /admin/trips/:tripId/rounds/:roundId/groups
- [x] Backend: trips.getTeeSheetPdf procedure — returns PDF buffer of tee sheet (groups, tee times, players, handicaps)
- [x] Frontend: AdminPlayers — check isCoAdmin for this tripId, redirect if not authorized
- [x] Frontend: AdminRounds — check isCoAdmin for this tripId, redirect if not authorized
- [x] Frontend: AdminGroups — check isCoAdmin for this tripId, redirect if not authorized
- [x] Frontend: TeeSheet page — add "Download PDF" button that fetches and downloads the PDF
- [x] Frontend: TripDashboard — show Tee Sheet link for completed rounds (not just active round)
- [x] Tests and checkpoint

## Session - Swipe Gestures, Score Edit, Player Profile

- [x] Score entry: swipe left/right on hole-by-hole view to navigate between holes (touch events)
- [x] Score entry: tap a saved score badge to re-open stepper and edit the score mid-round
- [x] Backend: players.getMyProfile procedure — returns nickname, currentHandicap, handicap history for the trip
- [x] Backend: players.updateMyNickname procedure (player-accessible, updates own nickname)
- [x] Frontend: /trip/:tripId/my-profile page — nickname edit, current handicap, handicap history chart
- [x] Frontend: link to My Profile from TripDashboard
- [x] Tests and checkpoint

## Session - Profile Photo, Score Summary, Push Notifications

- [x] DB: add photoUrl (varchar 512, nullable) column to trip_players table
- [x] Apply DB migration for photoUrl
- [x] Backend: POST /api/upload/profile-photo — accepts multipart, stores in S3, returns URL
- [x] Backend: players.setPhotoUrl procedure (player-accessible, updates own photoUrl)
- [x] Backend: expose photoUrl in getTripPlayers and getMyGroup responses
- [x] Backend: players.myRoundScores procedure — returns per-round gross/net totals for the current user
- [x] Backend: Web Push — store push subscriptions in push_subscriptions table (userId, endpoint, keys)
- [x] Backend: send Web Push notification when achievement is confirmed
- [x] Frontend: My Profile — photo upload button (camera icon on avatar), preview, save to S3
- [x] Frontend: My Profile — show uploaded photo in avatar circle
- [x] Frontend: My Profile — "My Scores" section with per-round gross/net/points summary
- [x] Frontend: Push notification subscription prompt on Trip Dashboard (ask permission, save subscription)
- [x] Frontend: Service worker handles push events and shows notification
- [x] Tests and checkpoint
