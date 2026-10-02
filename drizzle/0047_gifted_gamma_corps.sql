CREATE TABLE `score_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roundId` int NOT NULL,
	`userId` int NOT NULL,
	`holeId` int NOT NULL,
	`holeNumber` int NOT NULL,
	`oldGross` int,
	`newGross` int NOT NULL,
	`changedBy` int NOT NULL,
	`source` enum('entry','admin_correction','offline_sync') NOT NULL DEFAULT 'entry',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `score_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `score_disputes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roundId` int NOT NULL,
	`userId` int NOT NULL,
	`holeId` int NOT NULL,
	`holeNumber` int NOT NULL,
	`raisedBy` int NOT NULL,
	`note` varchar(500) NOT NULL,
	`status` enum('open','resolved','dismissed') NOT NULL DEFAULT 'open',
	`resolvedBy` int,
	`resolutionNote` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `score_disputes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `score_audit_round_idx` ON `score_audit_log` (`roundId`,`userId`,`holeId`);--> statement-breakpoint
CREATE INDEX `score_disputes_round_idx` ON `score_disputes` (`roundId`,`status`);