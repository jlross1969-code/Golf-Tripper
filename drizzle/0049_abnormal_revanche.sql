CREATE TABLE `trip_settlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`roundId` int,
	`fromUserId` int NOT NULL,
	`toUserId` int NOT NULL,
	`amountCents` int NOT NULL,
	`reason` varchar(200) NOT NULL,
	`settledAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_settlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `trip_settlements_trip_idx` ON `trip_settlements` (`tripId`);