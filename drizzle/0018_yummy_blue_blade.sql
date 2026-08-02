CREATE TABLE `match_play_fixture_holes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fixtureId` int NOT NULL,
	`holeNumber` int NOT NULL,
	`gross1A` int,
	`gross2A` int,
	`gross1B` int,
	`gross2B` int,
	`holeWinner` enum('teamA','teamB','halved'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `match_play_fixture_holes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `match_play_fixtures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roundId` int NOT NULL,
	`teamAId` int NOT NULL,
	`teamBId` int NOT NULL,
	`type` enum('singles','4bbb') NOT NULL DEFAULT 'singles',
	`useHandicap` boolean NOT NULL DEFAULT true,
	`player1AId` int NOT NULL,
	`player2AId` int,
	`player1BId` int NOT NULL,
	`player2BId` int,
	`matchStatus` int NOT NULL DEFAULT 0,
	`holesPlayed` int NOT NULL DEFAULT 0,
	`result` enum('teamA','teamB','halved'),
	`endedOnHole` int,
	`status` enum('pending','in_progress','complete') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `match_play_fixtures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `match_play_team_players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`roundId` int NOT NULL,
	`userId` int NOT NULL,
	`tripPlayerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `match_play_team_players_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `match_play_teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roundId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`emoji` varchar(10) NOT NULL DEFAULT '🏌️',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `match_play_teams_id` PRIMARY KEY(`id`)
);
