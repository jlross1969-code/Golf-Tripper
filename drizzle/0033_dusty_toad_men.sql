CREATE TABLE `trip_message_mention_reads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mentionId` int NOT NULL,
	`userId` int NOT NULL,
	`readAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_message_mention_reads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `trip_messages` ADD `parentMessageId` int;--> statement-breakpoint
ALTER TABLE `trip_messages` ADD `pinnedAt` timestamp;--> statement-breakpoint
ALTER TABLE `trip_messages` ADD `pinnedByUserId` int;