ALTER TABLE `trip_actual_expenses` ADD `category` varchar(80) DEFAULT 'Other' NOT NULL;--> statement-breakpoint
ALTER TABLE `trip_suppliers` ADD `paymentStatus` enum('unpaid','partially_paid','paid') DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE `trip_suppliers` ADD `paymentDueCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `trip_suppliers` ADD `paidCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `trip_travel_checklist_items` ADD `reminderAt` timestamp;--> statement-breakpoint
ALTER TABLE `trip_travel_checklist_items` ADD `reminderCronTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `trip_travel_checklist_items` ADD `reminderSentAt` timestamp;