CREATE TABLE `nearest_to_pin` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roundId` int NOT NULL,
	`holeId` int NOT NULL,
	`holeNumber` int NOT NULL,
	`winnerId` int,
	`winnerDistanceCm` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nearest_to_pin_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ntp_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ntpId` int NOT NULL,
	`userId` int NOT NULL,
	`distanceCm` float NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ntp_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `trips` MODIFY COLUMN `handicapBaseline` float NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `group_players` ADD `pairId` int;--> statement-breakpoint
ALTER TABLE `group_players` ADD `scorerId` int;--> statement-breakpoint
ALTER TABLE `groups` ADD `pairsLocked` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `rounds` ADD `dailyAdjustment` float DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `trip_players` ADD `nickname` varchar(64);