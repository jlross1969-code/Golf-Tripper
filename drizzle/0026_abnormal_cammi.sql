CREATE TABLE `trip_message_attachment_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`attachmentId` int NOT NULL,
	`reporterUserId` int NOT NULL,
	`reason` varchar(600),
	`status` enum('open','dismissed','removed') NOT NULL DEFAULT 'open',
	`resolvedAt` timestamp,
	`resolvedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_message_attachment_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_message_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int NOT NULL,
	`imageUrl` varchar(1024) NOT NULL,
	`imageKey` varchar(1024) NOT NULL,
	`imageAlt` varchar(180),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isRemoved` boolean NOT NULL DEFAULT false,
	`removedAt` timestamp,
	`removedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_message_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_message_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int NOT NULL,
	`userId` int NOT NULL,
	`emoji` varchar(16) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_message_reactions_id` PRIMARY KEY(`id`)
);
