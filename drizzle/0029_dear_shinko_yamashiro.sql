CREATE TABLE `trip_appearance_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`appearanceDate` timestamp NOT NULL,
	`colorScheme` varchar(16) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trip_appearance_schedules_id` PRIMARY KEY(`id`)
);
