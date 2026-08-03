ALTER TABLE `group_players` MODIFY COLUMN `userId` int;--> statement-breakpoint
ALTER TABLE `match_play_team_players` MODIFY COLUMN `userId` int;--> statement-breakpoint
ALTER TABLE `match_play_team_players` MODIFY COLUMN `tripPlayerId` int;--> statement-breakpoint
ALTER TABLE `group_players` ADD `inviteId` int;--> statement-breakpoint
ALTER TABLE `match_play_team_players` ADD `inviteId` int;