CREATE TABLE `trip_actual_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`plannedLineItemId` int,
	`label` varchar(180) NOT NULL,
	`amountCents` int NOT NULL,
	`paidAt` timestamp NOT NULL DEFAULT (now()),
	`notes` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_actual_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_payment_reminder_stages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`label` varchar(100) NOT NULL,
	`reminderAt` timestamp NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`status` enum('pending','sent','cancelled') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_payment_reminder_stages_id` PRIMARY KEY(`id`)
);
