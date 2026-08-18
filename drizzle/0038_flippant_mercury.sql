CREATE TABLE `trip_suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`contactName` varchar(120),
	`email` varchar(255),
	`phone` varchar(60),
	`notes` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_travel_checklist_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checklistItemId` int NOT NULL,
	`userId` int NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_travel_checklist_completions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_travel_checklist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`label` varchar(240) NOT NULL,
	`dueAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_travel_checklist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `trip_actual_expenses` ADD `supplierId` int;--> statement-breakpoint
ALTER TABLE `trip_actual_expenses` ADD `receiptUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `trip_actual_expenses` ADD `receiptFileName` varchar(255);--> statement-breakpoint
ALTER TABLE `trip_actual_expenses` ADD `approvalStatus` enum('pending','approved') DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `trip_actual_expenses` ADD `approvedByUserId` int;--> statement-breakpoint
ALTER TABLE `trip_actual_expenses` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `trip_financial_settings` ADD `expenseApprovalThresholdCents` int DEFAULT 0 NOT NULL;