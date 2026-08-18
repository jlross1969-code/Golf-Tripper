CREATE TABLE `trip_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`uploadedByUserId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` varchar(512) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`sizeBytes` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `trip_suppliers` ADD `invoiceDueAt` timestamp;--> statement-breakpoint
ALTER TABLE `trip_suppliers` ADD `invoiceReminderAt` timestamp;--> statement-breakpoint
ALTER TABLE `trip_suppliers` ADD `invoiceReminderCronTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `trip_suppliers` ADD `invoiceReminderSentAt` timestamp;