CREATE TABLE `assistant_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tripId` int,
	`title` varchar(180) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assistant_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assistant_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assistant_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_faqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`question` varchar(300) NOT NULL,
	`answer` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trip_faqs_id` PRIMARY KEY(`id`)
);
