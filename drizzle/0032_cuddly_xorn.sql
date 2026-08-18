CREATE TABLE `trip_message_mentions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`messageId` int NOT NULL,
	`mentionedUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_message_mentions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_message_moderation_audit` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`attachmentId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`action` enum('attachment_removed','report_dismissed') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_message_moderation_audit_id` PRIMARY KEY(`id`)
);
