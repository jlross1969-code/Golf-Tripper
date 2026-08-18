ALTER TABLE `trip_messages` ADD `isAnnouncement` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `trip_messages` ADD `editedAt` timestamp;--> statement-breakpoint
ALTER TABLE `trip_messages` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `trips` ADD `hideCourses` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `trips` ADD `coursesRevealed` boolean DEFAULT false NOT NULL;