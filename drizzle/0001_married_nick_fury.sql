CREATE TABLE `achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roundId` int NOT NULL,
	`userId` int NOT NULL,
	`holeId` int NOT NULL,
	`holeNumber` int NOT NULL,
	`par` int NOT NULL,
	`grossScore` int NOT NULL,
	`type` enum('hole_in_one','eagle','birdie') NOT NULL,
	`confirmed` boolean NOT NULL DEFAULT false,
	`broadcastSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`totalHoles` int NOT NULL DEFAULT 18,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`userId` int NOT NULL,
	`partnerId` int,
	CONSTRAINT `group_players_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roundId` int NOT NULL,
	`tripId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `handicap_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`userId` int NOT NULL,
	`roundId` int,
	`oldHandicap` float NOT NULL,
	`newHandicap` float NOT NULL,
	`roundScore` float,
	`reason` text NOT NULL,
	`isManual` boolean NOT NULL DEFAULT false,
	`adjustedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `handicap_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `holes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courseId` int NOT NULL,
	`holeNumber` int NOT NULL,
	`par` int NOT NULL,
	`strokeIndex` int NOT NULL,
	CONSTRAINT `holes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`message` text NOT NULL,
	`type` enum('achievement','round_start','round_complete','handicap_update','general') NOT NULL,
	`achievementId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`courseId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`roundDate` timestamp NOT NULL,
	`strokePlayEnabled` boolean NOT NULL DEFAULT true,
	`fourBBBEnabled` boolean NOT NULL DEFAULT false,
	`skinsEnabled` boolean NOT NULL DEFAULT false,
	`status` enum('scheduled','active','completed') NOT NULL DEFAULT 'scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rounds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roundId` int NOT NULL,
	`userId` int NOT NULL,
	`holeId` int NOT NULL,
	`grossScore` int NOT NULL,
	`netScore` int NOT NULL,
	`stablefordPoints` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `side_match_players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sideMatchId` int NOT NULL,
	`userId` int NOT NULL,
	`partnerId` int,
	`score` float,
	CONSTRAINT `side_match_players_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `side_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`roundId` int NOT NULL,
	`type` enum('match_play','nassau','skins','stableford','stroke') NOT NULL,
	`status` enum('pending','active','completed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `side_matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`userId` int NOT NULL,
	`startingHandicap` float NOT NULL DEFAULT 0,
	`currentHandicap` float NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_players_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`handicapMode` enum('stableford','net_stroke') NOT NULL DEFAULT 'stableford',
	`handicapBaseline` float NOT NULL DEFAULT 32,
	`handicapFactor` float NOT NULL DEFAULT 0.25,
	`handicapAutoAdjust` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trips_id` PRIMARY KEY(`id`)
);
