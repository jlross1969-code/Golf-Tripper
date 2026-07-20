CREATE TABLE `long_drive_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roundId` int NOT NULL,
	`tripPlayerId` int NOT NULL,
	`userId` int NOT NULL,
	`distanceToPinM` int NOT NULL,
	`holeDistanceM` int NOT NULL,
	`driveDistanceM` int NOT NULL,
	`isLeader` boolean NOT NULL DEFAULT false,
	`broadcastSent` boolean NOT NULL DEFAULT false,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `long_drive_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_award_winners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`awardId` int NOT NULL,
	`tripPlayerId` int,
	`groupPlayerId` int,
	`displayName` varchar(255),
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_award_winners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_awards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`roundId` int,
	`name` varchar(100) NOT NULL,
	`description` text,
	`prize` varchar(255),
	`category` enum('individual','team') NOT NULL DEFAULT 'individual',
	`position` enum('top1','top2','top3','top4','top5','last') NOT NULL,
	`scope` enum('daily','overall') NOT NULL DEFAULT 'overall',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trip_awards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `rounds` ADD `longDriveEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `rounds` ADD `longDriveHole` int;