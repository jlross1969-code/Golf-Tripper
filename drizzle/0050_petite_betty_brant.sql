CREATE TABLE `score_attestations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roundId` int NOT NULL,
	`userId` int NOT NULL,
	`attestedBy` int NOT NULL,
	`role` enum('player','marker') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `score_attestations_id` PRIMARY KEY(`id`),
	CONSTRAINT `score_attestations_unique` UNIQUE(`roundId`,`userId`,`attestedBy`)
);
