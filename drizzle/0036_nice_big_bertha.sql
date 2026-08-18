CREATE TABLE `trip_financial_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`type` enum('fixed_cost','per_person_cost','prize','income') NOT NULL,
	`label` varchar(180) NOT NULL,
	`amountCents` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_financial_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_financial_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`contingencyPercent` float NOT NULL DEFAULT 0,
	`rolloverCents` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trip_financial_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `trip_financial_settings_tripId_unique` UNIQUE(`tripId`)
);
--> statement-breakpoint
CREATE TABLE `trip_itinerary_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itineraryItemId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_itinerary_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_itinerary_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`type` enum('transport','accommodation','activity','other') NOT NULL,
	`title` varchar(180) NOT NULL,
	`location` varchar(255),
	`startsAt` timestamp,
	`endsAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_itinerary_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `trips` ADD `paymentDueAt` timestamp;--> statement-breakpoint
ALTER TABLE `trips` ADD `paymentReminderAt` timestamp;--> statement-breakpoint
ALTER TABLE `trips` ADD `paymentReminderCronTaskUid` varchar(65);