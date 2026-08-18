CREATE TABLE `trip_supplier_invoice_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`supplierId` int NOT NULL,
	`reviewerUserId` int NOT NULL,
	`status` enum('approved','rejected') NOT NULL,
	`note` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_supplier_invoice_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `trip_documents` ADD `expiresAt` timestamp;