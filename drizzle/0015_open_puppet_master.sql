CREATE TABLE `ambrose_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roundId` int NOT NULL,
	`groupId` int NOT NULL,
	`holeId` int NOT NULL,
	`holeNumber` int NOT NULL,
	`grossScore` int NOT NULL,
	`netScore` int NOT NULL,
	`stablefordPoints` int NOT NULL,
	`selectedDriveUserId` int,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ambrose_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `rounds` ADD `ambroseEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `rounds` ADD `ambroseTeamSize` int DEFAULT 4 NOT NULL;