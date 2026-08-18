CREATE TABLE `trip_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`userId` int NOT NULL,
	`amountCents` int NOT NULL,
	`status` enum('submitted','confirmed','rejected','manual_confirmed') NOT NULL DEFAULT 'submitted',
	`note` varchar(240),
	`submittedByUserId` int NOT NULL,
	`reviewedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `trip_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_scheduled_announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`message` text NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`status` enum('pending','processing','sent','cancelled') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_scheduled_announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `trip_players` ADD `tripPriceCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `trips` ADD `courseRevealAt` timestamp;--> statement-breakpoint
ALTER TABLE `trips` ADD `courseRevealCronTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `trips` ADD `financialManagerUserId` int;