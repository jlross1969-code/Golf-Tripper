-- Earlier schemas had no unique key on scores, so re-entered holes may have inserted duplicates.
-- Keep only the most recent row per (round, player, hole) before the unique key is added.
DELETE s1 FROM `scores` s1 INNER JOIN `scores` s2 ON s1.`roundId` = s2.`roundId` AND s1.`userId` = s2.`userId` AND s1.`holeId` = s2.`holeId` AND s1.`id` < s2.`id`;--> statement-breakpoint
ALTER TABLE `scores` ADD CONSTRAINT `scores_round_user_hole_unique` UNIQUE(`roundId`,`userId`,`holeId`);--> statement-breakpoint
CREATE INDEX `achievements_round_idx` ON `achievements` (`roundId`);--> statement-breakpoint
CREATE INDEX `group_players_group_idx` ON `group_players` (`groupId`);--> statement-breakpoint
CREATE INDEX `group_players_user_idx` ON `group_players` (`userId`);--> statement-breakpoint
CREATE INDEX `groups_round_idx` ON `groups` (`roundId`);--> statement-breakpoint
CREATE INDEX `notifications_trip_created_idx` ON `notifications` (`tripId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `rounds_trip_idx` ON `rounds` (`tripId`);--> statement-breakpoint
CREATE INDEX `scores_user_idx` ON `scores` (`userId`);--> statement-breakpoint
CREATE INDEX `trip_messages_trip_idx` ON `trip_messages` (`tripId`);--> statement-breakpoint
CREATE INDEX `trip_players_trip_user_idx` ON `trip_players` (`tripId`,`userId`);