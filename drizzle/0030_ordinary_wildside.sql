CREATE TABLE `trip_appearance_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`colorScheme` varchar(16) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_appearance_templates_id` PRIMARY KEY(`id`)
);
