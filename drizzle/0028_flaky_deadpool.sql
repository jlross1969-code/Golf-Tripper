CREATE TABLE `trip_message_attachment_action_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`attachmentId` int NOT NULL,
	`action` enum('download','share') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_message_attachment_action_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `trips` ADD `defaultColorScheme` varchar(16);