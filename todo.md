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

## Session - Photo Avatars, Admin Score Correction, HC Recalc Prompt

- [x] Backend: expose photoUrl in leaderboard (daily + trip) responses
- [x] Backend: expose photoUrl in getGroupPlayers response
- [x] Backend: scores.adminCorrect procedure (admin only) — update any player's score for any hole
- [x] Frontend: leaderboard rows show small avatar circle with photo or initial fallback
- [x] Frontend: group player chips show avatar with photo or initial fallback
- [x] Frontend: Admin score correction UI — accessible from AdminGroups or a dedicated scorecard view
- [x] Frontend: end-of-round recalculation prompt — when admin marks round complete, show dialog asking to run HC recalculation now
- [x] Tests and checkpoint

## Session - Scorecard Correction & Avatar Upload

- [x] Read player scorecard page and profile page to understand current structure
- [x] Backend: players.updatePhoto procedure (upload photo to S3, save URL to trip_players)
- [x] Backend: ensure scores.adminCorrect is accessible from scorecard context (already exists)
- [x] Frontend: player scorecard page — add pencil icon per hole row for admin score correction
- [x] Frontend: player profile page — add avatar upload UI (file picker, preview, save)
- [x] Tests and checkpoint

## Session - Achievement Guard & Profile History

- [x] Backend: duplicate achievement guard in createAchievement — skip if one already exists for same userId+holeId+roundId
- [x] Backend: getAchievementsByPlayer query (by userId, across all trips/rounds)
- [x] Backend: achievements.listByPlayer tRPC procedure
- [x] Frontend: achievement history section on MyProfile page
- [x] TypeScript check, tests, checkpoint

## Session - Achievement Badge & Highlights Tab

- [x] Frontend: achievement count badge on profile avatar (gold badge with total count)
- [x] Backend: leaderboard.getRoundHighlights procedure — top 3 individual (Stableford) + top 3 4BBB pairs
- [x] Frontend: Highlights tab on Daily Leaderboard page — top 3 individual and top 3 4BBB pair finishes
- [x] TypeScript check, checkpoint

## Session - Trip Highlights, Achievement Badges & Share Button

- [x] Frontend: Highlights tab on Trip Leaderboard (top 3 cumulative individual + top 3 4BBB pairs)
- [x] Backend: trip leaderboard to include 4BBB cumulative pairs data
- [x] Frontend: achievement count badges on Daily Leaderboard rows (eagle/birdie count per round)
- [x] Frontend: achievement count badges on Trip Leaderboard rows (total across all rounds)
- [x] Backend: achievements per player per round exposed in daily leaderboard data
- [x] Frontend: share/screenshot button on Daily Leaderboard Highlights tab (html2canvas or native share)
- [x] TypeScript check, checkpoint

## Session - Trip Highlights Share, Achievement Badges, Grouping Copy/Re-seed

- [x] Frontend: share button on Trip Leaderboard Highlights tab
- [x] Frontend: achievement badges (HIO/Eagle/Birdie cumulative) on Trip Leaderboard rows
- [x] Backend: Highlights push notification when round is marked complete
- [x] Backend: groups.copyToRound procedure — copy exact groups+pairings from one round to another
- [x] Backend: groups.reseedBy4BBB procedure — re-seed groups by 4BBB pair ranking from previous round
- [x] Backend: groups.reseedByIndividual procedure — re-seed groups by individual net trip ranking (top players together)
- [x] Frontend: Copy/Re-seed Groupings dialog on AdminGroups page (3 options + preview + confirm)
- [x] TypeScript check, tests, checkpoint

## Session - Re-seed Preview, 4BBB Notification, Admin Scorecard

- [x] Backend: groups.previewCopy, groups.preview4BBB, groups.previewIndividual dry-run procedures (return proposed groups without writing)
- [x] Backend: extend round-complete notification to include 4BBB winning pair when fourBBBEnabled
- [x] Frontend: re-seed preview step in Copy/Re-seed dialog — show proposed groups before committing
- [x] Backend: admin scorecard query — all 18 holes for a player in a round with hole details
- [x] Frontend: admin per-player scorecard drawer/page from AdminGroups (read-only + correction pencil per hole)
- [x] TypeScript check, checkpoint

## Session - Team Names, Side Match 4BBB, Scorecard Compare, Re-seed Edit, Round PDF

- [x] DB: add teamName (varchar 64, nullable) to group_players table (per pair — both players in a pair share it)
- [x] Apply DB migration for teamName
- [x] Backend: groups.setTeamName procedure (player sets own pair's team name)
- [x] Backend: expose teamName in getGroupPlayers, getMyGroup, and group match queries
- [x] Backend: auto team name fallback = "Team [lowest marker nickname/name]" (client-side fallback on GroupPairing + SideMatches)
- [x] Frontend: team name input on GroupPairing page (player sets after pairing)
- [x] Frontend: team name shown on Side Match summary and hole-by-hole views
- [x] Backend: 4BBB matchplay engine — best-ball Stableford per hole (pick best of pair), running match status (X Up / AS / X Down), final result
- [x] Backend: groupMatch.getByRound returns hole-by-hole best-ball Stableford for each pair + running match status
- [x] Backend: groupMatch.getHoleByHole — new procedure returning per-hole best-ball Stableford + match result for detailed view
- [x] Frontend: Side Match page — Summary view (team names, HC, match result per pair)
- [x] Frontend: Side Match page — Hole-by-Hole sheet (Hole / Par / SI / A Pts / Match / B Pts / Status table, winner highlighted per row)
- [x] Frontend: Scorecard comparison drawer in ScoreEntry — side-by-side both partners' 18 holes with best-ball result per hole
- [x] Frontend: Re-seed preview drag-to-edit — drag players between proposed groups before confirming
- [x] Backend + Frontend: Round summary PDF — top 3 individual, top 3 4BBB pairs, achievements, skins results
- [x] TypeScript check, tests, checkpoint

## Session - Inline Team Name Edit & Scorecard Animation

- [x] Frontend: SideMatches — inline team name edit (pencil icon next to team name, inline input with save/cancel, calls groups.setTeamName)
- [x] Frontend: ScoreEntry scorecard comparison drawer — highlight animation on winning team's score cell when a new hole result is detected
- [x] TypeScript check, tests, checkpoint

## Session - Team Name Limit, Empty Revert & Score Header Flash

- [x] Frontend: SideMatches inline team name — enforce 20-char max with character counter and warning message (not just maxLength attribute)
- [x] Frontend: SideMatches inline team name — saving empty input clears the stored name so the auto-generated default is shown
- [x] Frontend: ScoreEntry scorecard drawer — extend winner-flash animation to the match score summary header (wins/halves/losses tally) when match status updates
- [x] TypeScript check, tests, checkpoint

## Session - Inline Edit Polish & Skill Creation

- [x] Frontend: SideMatches inline team name — smooth fade-in/fade-out CSS transition when editor opens/closes
- [x] Frontend: SideMatches inline team name — loading spinner inside save button while mutation is pending
- [x] Frontend: SideMatches inline team name — double-click on team name text to enter edit mode
- [x] Skill: create reusable inline-editable-field skill documenting the pattern used in this project
- [x] TypeScript check, tests, checkpoint

## Session - Emoji Mascot Picker

- [x] DB: add teamEmoji (varchar 8, nullable) column to group_players table
- [x] Apply DB migration for teamEmoji
- [x] Backend: extend groups.setTeamName to accept and save teamEmoji; expose teamEmoji in getGroupPlayers, getMyGroup, and groupMatch queries
- [x] Frontend: emoji picker popover in the inline team name editor (curated golf/sport emoji list)
- [x] Frontend: display selected emoji next to team name in display mode and in SideMatches match cards
- [x] TypeScript check, tests, checkpoint

## Session - Emoji Picker Search, Bounce Animation, Randomize

- [x] Frontend: emoji picker — add search input to filter curated list and search unicode emoji names
- [x] Frontend: team mascot emoji in summary card — bounce animation when that team wins a hole
- [x] Frontend: randomize button next to emoji picker — generates a fun random team name + matching emoji
- [x] TypeScript check, tests, checkpoint

## Session - Custom Awards + Long Drive

### Custom Awards
- [x] DB: create `trip_awards` table (id, tripId, name, description, prize, scope: daily|overall, category: individual|team, position: top1|top2|top3|top4|top5|last, roundId nullable for daily)
- [x] DB: create `trip_award_winners` table (id, awardId, tripPlayerId, pairGroupId nullable, roundId nullable, assignedAt)
- [x] Apply DB migrations
- [x] Backend: awards.list (by tripId), awards.create, awards.update, awards.delete (admin only)
- [x] Backend: awards.assignWinner / awards.clearWinner (admin can manually assign or auto-suggest from leaderboard)
- [x] Backend: awards.getWinnersForTrip (returns award + winner name for display)
- [x] Frontend: Admin Awards page — list, create, edit, delete awards with name/prize/scope/category/position fields
- [x] Frontend: Awards panel on daily leaderboard page — shows awards relevant to that round
- [x] Frontend: Awards panel on overall/trip leaderboard — shows overall awards with winners
- [x] Frontend: Admin can assign winner from leaderboard position (auto-suggest button)

### Long Drive
- [x] DB: add `longDriveHole` (int nullable) and `longDriveEnabled` (bool default false) to `rounds` table
- [x] DB: create `long_drive_entries` table (id, roundId, tripPlayerId, holeDistance int meters, distanceToPin int meters, driveDistance computed/stored int, recordedAt timestamp)
- [x] Apply DB migrations
- [x] Backend: rounds.setLongDrive (admin sets hole + enables/disables)
- [x] Backend: longDrive.submitEntry (player submits distanceToPin; system calculates driveDistance = holeDistance - distanceToPin; validates > 0)
- [x] Backend: longDrive.getLeaderboard (returns sorted entries with player names, driveDistance, hole info)
- [x] Backend: longDrive.getBestEntry (returns current leader for a round)
- [x] Backend: broadcast achievement alert when a new long drive leader is set (same pattern as eagle/birdie alerts)
- [x] Frontend: Admin round settings — toggle long drive on/off, set hole number
- [x] Frontend: LongDriveResults player page — rangefinder entry (yards to pin), drive distance = hole length − distance to pin, live leaderboard (15s poll)
- [x] Frontend: Long Drive leaderboard visible to all players with achievement popup on new leader
- [x] Frontend: Long Drive button in TripDashboard active round actions (only when longDriveEnabled)
- [x] Frontend: Long Drive link in AdminRounds round card actions
- [x] TypeScript check, tests, checkpoint

## Session - Long Drive Unit Toggle
- [x] Frontend: LongDriveResults — yards/metres toggle switch; convert input value before sending to server (server always stores metres); display leaderboard distances in the chosen unit; persist preference to localStorage

## Session - Long Drive Rules
- [x] Backend: longDrive.submitEntry rejects if calculated drive distance does not beat the current round leader's best drive (return descriptive error with current leader's distance)
- [x] Frontend: LongDriveResults entry form — add "Must be on the fairway" rule notice; show friendly toast when server rejects a non-beating drive (include current leader distance in message)
- [x] TypeScript check, tests, checkpoint

## Session - Billing Scaffold (Future Payment Ready)

### DB Schema
- [x] Add `planTier` enum to users table: free | playerPremium | clubPlan
- [x] Add `subscriptionStatus` to users: active | trialing | cancelled | none
- [x] Add `stripeCustomerId` (nullable) to users table
- [x] Add `planTier` to trips table: free | tripPass | clubPlan
- [x] Add `planActivatedAt` (nullable timestamp) to trips table
- [x] Apply DB migrations

### Backend
- [x] shared/plans.ts — BILLING_ENABLED flag, plan tier enums, feature-gate helpers (canTripAccessFeature, canUserAccessFeature), upgrade prompt copy, FREE_PLAYER_LIMIT constant
- [x] Backend: plans router — getMyPlan, getTripPlan, adminSetTripPlan, adminSetUserPlan procedures

### Frontend
- [x] PlanBadge component (TripPlanBadge + UserPlanBadge)
- [x] UpgradePrompt component (renders nothing when BILLING_ENABLED = false)
- [x] AdminPlanManagement page — list all trips + users with current plan tier, dropdown to override tier, feature access reference table
- [x] Plans link in AdminTrips header (global admin only)

- [x] TypeScript check, tests, checkpoint

## Session - Billing UI Enhancements

- [x] Frontend: UpgradePrompt — sleek tier comparison table showing Free vs Trip Pass vs Premium vs Club benefits (unlimited players, custom awards, long drive, etc.)
- [x] Frontend: Premium Feature badge/tooltip on Long Drive and Custom Awards in admin settings (Zap icon + "Premium Feature" label)
- [x] Frontend: AdminPlanManagement — "Simulate Billing Enabled" toggle that temporarily sets BILLING_ENABLED=true in session storage so admins can preview feature gates
- [x] TypeScript check, tests, checkpoint

## Session - Player Scorecard Drawer on Daily Leaderboard

- [x] Frontend: DailyLeaderboard — clicking a player row on Stroke Play tab opens a bottom sheet/drawer showing their hole-by-hole scorecard (hole, par, SI, gross, net, Stableford pts) using the existing scores.getPlayerScorecard tRPC procedure
- [x] Frontend: Scorecard drawer shows totals row (gross/net/pts), color-codes scores (eagle/birdie/par/bogey/double+), and handles holes not yet played
- [x] TypeScript check, tests, checkpoint

## Session - Mismatch Dialog Player Names

- [x] Frontend: ScoreEntry mismatch dialog — change mismatch state from number[] to {holeNumber, missingPlayer}[] so each hole badge shows which player is missing a score (e.g. "Hole 9 — Whitty missing")
- [x] TypeScript check, tests, checkpoint

## Session - Mismatch Dialog Enhancements

- [x] Frontend: ScoreEntry mismatch dialog — group by hole so multiple missing players on the same hole are listed together (e.g. "Hole 9 — Whitty, John Ross missing")
- [x] Frontend: ScoreEntry mismatch dialog — red warning icon and red text color for missing player names to make them stand out
- [x] Frontend: ScoreEntry mismatch dialog — "Enter Score" button per hole row that jumps to that hole in hole-by-hole mode and closes the dialog
- [x] TypeScript check, tests, checkpoint

## Session - Mismatch Dialog Context & Auto-Reopen

- [x] Frontend: ScoreEntry mismatch dialog — show the partner's existing gross score next to the missing player's name for context (e.g. "Whitty missing — John Ross scored 5")
- [x] Frontend: ScoreEntry score entry — after submitting a score while the mismatch flow is active, re-check for remaining mismatches and auto-reopen the dialog if any remain
- [x] TypeScript check, tests, checkpoint

## Session - Scorer Card Ordering

- [x] Frontend: ScoreEntry — reorder scoringPlayers so the current user (scorer) is always first (top card)
- [x] Frontend: ScoreEntry — add a subtle "You" badge or "Marking" label on the current user's card so it's clear who is scoring
- [x] TypeScript check, tests, checkpoint

## Session - ScoreEntry Enhancements (Running Total, Flash, Mercy Rule)

- [x] Frontend: ScoreEntry — show running score vs par (e.g. "+3" or "-1") next to each player's name in the card header
- [x] Frontend: ScoreEntry — flash/highlight animation on the player card when a score is successfully saved
- [x] Schema + DB: Add mercyRuleEnabled (boolean, default false) and mercyRuleStrokes (int, default 5) to rounds table
- [x] Backend: AdminRound — expose mercy rule fields via rounds.get and rounds.update procedures
- [x] Frontend: AdminRoundSettings — mercy rule toggle + stroke adjuster (min 4, max 6) in round settings
- [x] Backend: scores.submit — apply mercy rule cap (par + mercyRuleStrokes) to grossScore before saving when mercyRuleEnabled
- [x] TypeScript check, tests, checkpoint

## Session - Mercy Indicator, Stroke Count, Round PDF

- [x] Frontend: DailyLeaderboard — show a small asterisk (*) or amber "M" badge next to any score that was mercy-capped (requires mercyCapped flag on scorecard data)
- [x] Backend: getRoundScorecard — add mercyCapped boolean per score so the leaderboard can detect capped scores
- [x] Frontend: ScoreEntry — show total gross stroke count right next to the vs-par badge (e.g. "+3 · 39 shots")
- [x] Backend + Frontend: Round summary PDF — leaderboard table + per-player hole-by-hole scorecard with mercy M marker, downloadable from leaderboard page
- [x] TypeScript check, tests, checkpoint

## Session - ScoreEntry SI Relocation

- [x] Frontend: ScoreEntry — remove SI badge from player card header; add "Stroke Index" as 4th column in the Shots / Pts / Total pts footer row

## Session - Ambrose Format & Best Day Leaderboard

- [x] DB: add ambroseEnabled (boolean, default false) and ambroseTeamSize (int, default 4) to rounds table
- [x] DB: create ambrose_scores table (id, roundId, groupId, holeId, holeNumber, grossScore, netScore, stablefordPoints, selectedDriveUserId, createdAt)
- [x] Apply DB migration for Ambrose schema changes
- [x] Backend: shared/scoring.ts — calculateAmbroseTeamHandicap and calculateAmbroseNetScore helpers
- [x] Backend: db.ts — upsertAmbroseScore, getAmbroseScoresByGroup, getAmbroseLeaderboard, getTripAmbroseLeaderboard helpers
- [x] Backend: ambrose tRPC router — getLeaderboard, getGroupScores, submitScore, getTripLeaderboard procedures
- [x] Backend: rounds.create and rounds.update accept ambroseEnabled and ambroseTeamSize
- [x] Backend: leaderboard.trip returns hasAmbroseRound, hasFourBBBRound, bestDayStableford, bestDayStroke, ambrose data
- [x] Admin UI: AdminRounds — Ambrose toggle + team size selector (2–4) in create/edit dialogs
- [x] Admin UI: AdminRounds — Ambrose badge on round cards + "Ambrose Scores" link to /round/:id/ambrose
- [x] Frontend: AmbroseScoreEntry page — hole-by-hole team score entry with colour-coded score buttons, scorecard summary
- [x] Frontend: Route /round/:roundId/ambrose added to App.tsx
- [x] Frontend: DailyLeaderboard — Ambrose tab (auto-selected when ambroseEnabled), 4BBB auto-selected when fourBBBEnabled
- [x] Frontend: TripLeaderboard — Best Day tab (each player's best single round), 4BBB tab, Ambrose tab (all conditionally shown)
- [x] TypeScript check (0 errors), all 51 tests passing, checkpoint

## Session - Automatic Score-Marker Side Matches

- [x] Define and persist each player’s selected score marker at the start of an active round
- [x] Add a player-facing score-marker selection flow that makes mutual selections clear before scoring begins
- [x] Automatically create a default 4BBB Match Play side match when two mutual marker pairs exist in the same four-player group
- [x] Automatically create linked Singles Match Play side matches between mutually marking players
- [x] Prevent duplicate automatic matches and retain existing results when score-marker selections are revisited
- [x] Update score-entry integration so automatic match status reflects submitted hole scores
- [x] Redesign Side Matches with a Team / Single toggle, hole-by-hole score grid, front-nine/back-nine/overall summaries, and winner states
- [x] Add tests, verify TypeScript and the live UI, save checkpoint, and publish

## Session - Side Match Audit & Fixes

- [x] Backend: matchPlay.getByRound — change from protectedProcedure to publicProcedure so unauthenticated users can view match results
- [x] Backend: matchPlay.getByRound — enrich response with player display names (same pattern as groupMatch.getByRound)
- [x] Backend: sideMatches.list — enrich sideMatchPlayers with display names from trip_players/users
- [x] Frontend: MatchPlay page — show player names instead of raw IDs in match selector and status display
- [x] Frontend: SideMatches page — show player names instead of raw IDs in "Other Side Matches" section
- [x] Frontend: TripDashboard — add "Side Matches" link button on active round cards (visible when round is active)
- [x] TypeScript check (0 errors), 51 tests passing, checkpoint

## Session - Four New Features

- [x] Feature 1: Hide net score column on Stableford trips — leaderboard and scorecard views should not show net stroke score when trip mode is stableford
- [x] Feature 2: Trip rules — admin can add/edit/delete trip rules; rules shown on trip dashboard for all players; rules included in invite email body
- [x] Feature 2: Schema migration — rules column added to trips table (text, nullable)
- [x] Feature 3: Player scorecard viewer — any user can tap another player's name on leaderboard to see their full hole-by-hole scorecard with: gross score, stroke index, net score (gross minus handicap strokes on that hole), and Stableford points per hole
- [x] Feature 3: Stroke example: show net score = gross - (1 if handicap strokes cover this hole's stroke index, else 0); Stableford: show points = 2 + par - net (capped at 0 min)
- [x] Feature 4: Trip logo upload — admin can upload a logo image for the trip; stored in S3; displayed on trip dashboard header
- [x] Feature 4: Round logo upload — admin can upload a logo per round; if not set, falls back to trip logo; displayed on daily leaderboard and scorecard headers
- [x] Feature 4: Schema migration — add logoUrl column to trips and rounds tables
- [x] TypeScript check (0 errors), 51 tests passing, checkpoint

## Session - Trip Leaderboard Scorecard Fix

- [x] Trip Leaderboard: tap player name/row to open scorecard drawer (same as Daily Leaderboard)
- [x] Trip Leaderboard scorecard: since trip spans multiple rounds, show a round selector so user can pick which round's scorecard to view

## Session - Round Scoring Mode & Format Exclusivity Fix

- [x] DB: add individualScoringMode column to rounds table (enum: 'stableford' | 'net_stroke', default 'stableford')
- [x] Apply DB migration for individualScoringMode
- [x] Backend: rounds.create and rounds.update accept individualScoringMode field
- [x] Backend: leaderboard.daily uses round.individualScoringMode instead of trip.handicapMode for per-round scoring
- [x] AdminRounds: always show Individual Scoring Mode selector (Stableford / Net Stroke) at top of Formats section
- [x] AdminRounds: default scoring mode from trip.handicapMode when opening Create Round dialog
- [x] AdminRounds: enforce mutual exclusivity — Match Play / Alternate Shot / Ambrose are exclusive team formats (disable 4BBB, Skins, and each other when one is selected)
- [x] AdminRounds: show helper text explaining format rules (e.g. "Ambrose cannot be combined with 4BBB or Skins")
- [x] TypeScript check (0 errors), 51 tests passing, checkpoint

## Session - Pennant Match Play System

- [x] DB: match_play_teams table (id, roundId, name, emoji, createdAt)
- [x] DB: match_play_fixtures table (id, roundId, teamAId, teamBId, type: singles|4bbb, useHandicap, player1AId, player2AId nullable, player1BId, player2BId nullable, status: pending|in_progress|complete, result: teamA|teamB|halved|null, createdAt)
- [x] DB: match_play_fixture_holes table (id, fixtureId, holeNumber, gross1A, gross2A nullable, gross1B, gross2B nullable, holeWinner: teamA|teamB|halved|null)
- [x] DB: match_play_team_players table (id, teamId, roundId, userId, tripPlayerId)
- [x] Apply DB migration for pennant match play tables
- [x] Backend: pennant.createTeam (admin) — create a team for a round
- [x] Backend: pennant.assignPlayer (admin) — assign trip player to a team
- [x] Backend: pennant.removePlayer (admin) — remove player from team
- [x] Backend: pennant.createFixture (admin) — create singles or 4BBB fixture between two players/pairs
- [x] Backend: pennant.submitHole (player/admin) — record gross scores for a hole in a fixture, recompute match status
- [x] Backend: pennant.getFixtures (public) — list all fixtures for a round with hole-by-hole status, running match score, and team totals
- [x] Backend: pennant.getTeams (public) — list teams with assigned players
- [x] Backend: pennant scoring engine — compute running match status per fixture (X Up / AS / X Down / Won / Lost) with and without handicap
- [x] Backend: pennant.getTeamScore — count fixture wins/halves/losses per team, show actual (completed fixtures) vs estimated (in-progress fixtures projected from current status)
- [x] Admin UI: AdminPennant page — create two teams, assign players, show team rosters
- [x] Admin UI: Fixture Builder — select singles or 4BBB, toggle handicap, pick players from each team, create fixture
- [x] Admin UI: Fixture list — show all fixtures with current status, Score button, allow deletion
- [x] Admin UI: Match Play Setup link on round cards in AdminRounds (when matchPlayEnabled)
- [x] Player UI: PennantFixtureScoring page — hole-by-hole gross score entry for a fixture, running match status, hole results table
- [x] Player UI: MatchPlay page — Pennant Team Score panel showing actual vs estimated points, fixture score links
- [x] Routes: /admin/trips/:tripId/rounds/:roundId/pennant and /round/:roundId/pennant/fixture/:fixtureId added to App.tsx
- [x] TypeScript check (0 errors), 51 tests passing, checkpoint

## Session - Edit Trip from Sub-Pages

- [x] Add Edit Trip button/link to the admin trip sub-page header (DashboardLayout or shared trip header) so admins can edit trip details without navigating back to the trips list

## Session - Trip Tournament Type

- [x] DB: add tournamentType enum column to trips table (stableford | stableford_4bbb | stroke | stroke_4bbb | matchplay | ambrose | alternate_shot), nullable/default null for existing trips
- [x] DB migration: applied via webdev_execute_sql
- [x] Backend: trips.create — accepts tournamentType, auto-sets round format flags when creating rounds
- [x] Backend: trips.update — accepts tournamentType, blocks change if trip has started, syncs all rounds when changed on upcoming trip
- [x] Backend: rounds.create — inherits format flags from trip.tournamentType when creating a new round
- [x] Backend: trips.get — returns tournamentType field
- [x] Frontend: Create Trip dialog — Tournament Type selector (required), shows format description per option
- [x] Frontend: EditTripDialog — Tournament Type selector, disabled if trip has started with warning
- [x] Frontend: Trip cards in AdminTrips — tournament type badge shown on each card
- [x] Frontend: Trip Dashboard — tournament type badge shown in header
- [x] Frontend: Trip Leaderboard — default tab respects tournament type (stableford → Stableford tab, stroke → Net Stroke tab)
- [x] TypeScript check (0 errors), 51 tests passing, checkpoint

## Session - Trip Leaderboard Scorecard Drill-Down

- [x] Trip Leaderboard: tap player row opens a drawer showing hole-by-hole scorecard for each round played
- [x] Drawer shows round name, date, gross/net/stableford per hole, totals per round (Best Day and Highlights tabs also wired)
- [x] TypeScript check (0 errors), checkpoint

## Session - Allow Assigning Pending Players to Teams/Groups

- [x] AdminPennant: show all trip players (including pending/unregistered) in team player selector; colour pending names amber with a "Pending" badge
- [x] AdminGroups: show all trip players (including pending/unregistered) in group player selector; colour pending names amber with a "Pending" badge
- [x] TypeScript check (0 errors), 51 tests passing, checkpoint

## Session - Smart Group Seeding

- [x] Backend: groups.previewSmartSeed procedure — accepts seedMethod, pairingMethod, teeOrder, groupSize, roundId, tripId; returns proposed groups with pairs
- [x] Backend: handicap_mix algorithm — sort by HCP, snake-draft into groups
- [x] Backend: top_together algorithm — sort by HCP descending, fill groups sequentially
- [x] Backend: previous_round algorithm — rank by last completed round leaderboard, snake-draft
- [x] Backend: pairingMethod=keep_last — keep same 4BBB partners, reshuffle groups by seed
- [x] Backend: pairingMethod=seed_4bbb — rank 4BBB pairs by leaderboard, keep top pair together
- [x] Backend: teeOrder — reverse group order when bottom_first
- [x] Frontend: AdminGroups Re-seed dialog — Smart Seed option with grouping method (4), pairing method (3), tee order toggle, group size, reference round selectors
- [x] TypeScript check (0 errors), 51 tests passing, checkpoint

## Session - 5 New Features

### Feature 1: Auto-seed groups in Create Round dialog
- [x] Frontend: AdminRounds Create Round dialog — add optional "Auto-seed groups" section with Smart Seed controls
- [x] Backend: rounds.create — if autoSeed params provided, create groups and seed them immediately after round creation
- [x] Backend: new helper createAndSeedGroups(roundId, tripId, seedParams) reusing previewSmartSeed + applyCustom logic

### Feature 2: Format lock for specialty trip types
- [x] Frontend: AdminRounds Create/Edit Round dialogs — when trip tournamentType is ambrose or alternate_shot, lock format toggles and show explanation
- [x] Frontend: AdminRounds — when trip tournamentType is matchplay, lock round to matchPlay format only
- [x] Frontend: Show tooltip/badge explaining why toggles are locked

### Feature 3: Match Play trip leaderboard
- [x] Backend: leaderboard.tripMatchPlay procedure — return team wins/halves/losses/points from pennant fixtures
- [x] Frontend: TripLeaderboard — when tournamentType is matchplay, show Pennant Team Score view as primary tab
- [x] Frontend: Team cards with W/H/L record, points total, fixture list

### Feature 4: Auto-link pending players on invite acceptance
- [x] Backend: promoteInviteToUser(inviteId, userId) helper in db.ts — updates groupPlayers + matchPlayTeamPlayers
- [x] Backend: Call promoteInviteToUser in joinViaToken handler after trip_players insert

### Feature 5: Round format badge on round cards
- [x] Frontend: AdminRounds — show small format badge on each round card derived from round format flags
- [x] Frontend: Badge shows "Stableford", "4BBB", "Stroke", "Match Play", "Ambrose", "Alt Shot" etc.

- [x] TypeScript check (0 errors), tests passing, checkpoint

## Session - 5 New Features

- [x] Feature 5: Round format badges with colour-coding and inherited format indicator on round cards in AdminRounds
- [x] Feature 2: Format lock for specialty trip types (matchplay/ambrose/alternate_shot) in Create Round and Edit Round dialogs
- [x] Feature 1: Auto-seed groups option in Create Round dialog — Smart Seed controls (method, pairing, tee order, group size) applied immediately after round creation via new groups.applySmartSeed procedure
- [x] Feature 3: Match Play trip leaderboard — getTripPennantLeaderboard in db.ts, pennantLeaderboard in leaderboard.trip, Pennant Team Score tab as primary tab for matchplay trips in TripLeaderboard
- [x] Feature 4: Auto-link pending players on invite acceptance — promoteInviteSlots in db.ts, called in invites.accept after acceptInvite

## Session - 4BBB Pair Scorecard Drill-Down

- [x] Inspect the existing cumulative 4BBB leaderboard data and pair identifiers
- [x] Add a hole-by-hole pair scorecard query for the selected round
- [x] Make 4BBB Trip Leaderboard rows tappable and open the pair scorecard drawer
- [x] Show each player score, the counting best-ball score, and front/back/total team summary
- [x] Add tests, verify TypeScript and mobile UI, checkpoint, and publish

## Session - Stableford 4BBB Best-Points Correction

- [x] Replace cumulative 4BBB best-net aggregation with highest Stableford points per pair per hole
- [x] Return the counting best Stableford points in the pair scorecard query
- [x] Update 4BBB leaderboard rankings, totals, labels, and scorecard columns to use points
- [x] Add Stableford 4BBB best-points tests, validate TypeScript and UI, checkpoint, and publish

## Session - Long Drive Selection Persistence

- [x] Trace the Long Drive Set action, backend update, and round query refresh
- [x] Fix persistence or cache invalidation so a selected Long Drive hole is immediately displayed as enabled
- [x] Run regression coverage, validate the mobile admin flow, checkpoint, and publish

## Session - Countback Tie-Breaks and Scorecard Image Import

- [x] Audit individual, 4BBB, daily, trip, highlight, PDF, and notification leaderboard ordering
- [x] Add standard countback calculations: back 9, last 6, last 3, then 18th hole
- [x] Apply countback ordering and clear tie-break explanation to individual and 4BBB daily/trip leaderboards
- [x] Add secure server-side scorecard image upload and structured AI vision extraction
- [x] Detect multiple tee columns and require the admin to select the tee before importing
- [x] Add editable import preview for course name, hole par, stroke index, and selected-tee distances
- [x] Save the confirmed import as a course and its 18 holes without duplicating entries
- [x] Add tests, validate mobile UI, checkpoint, and publish
