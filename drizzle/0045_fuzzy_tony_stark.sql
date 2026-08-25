CREATE TABLE `project_backups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`monthlyEnabled` boolean NOT NULL DEFAULT false,
	`monthlyCronTaskUid` varchar(65),
	`lastDatabaseBackupKey` varchar(512),
	`lastObjectArchiveKey` varchar(512),
	`lastBackupAt` timestamp,
	`lastBackupSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_backups_id` PRIMARY KEY(`id`)
);
