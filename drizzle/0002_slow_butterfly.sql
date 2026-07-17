CREATE TABLE `matchplay_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roundId` int NOT NULL,
	`groupId` int NOT NULL,
	`player1Id` int NOT NULL,
	`player2Id` int NOT NULL,
	`player1PartnerId` int,
	`player2PartnerId` int,
	`holeResults` text NOT NULL DEFAULT ('[]'),
	`matchStatus` int NOT NULL DEFAULT 0,
	`winner` enum('player1','player2','halved','pending') NOT NULL DEFAULT 'pending',
	`endedOnHole` int,
	`nextTeePlayer` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matchplay_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`userId` int NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `rounds` ADD `matchPlayEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `rounds` ADD `alternateShotEnabled` boolean DEFAULT false NOT NULL;