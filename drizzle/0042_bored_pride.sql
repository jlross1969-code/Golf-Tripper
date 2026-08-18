ALTER TABLE `trip_suppliers` ADD `invoiceApprovalStatus` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `trip_suppliers` ADD `invoiceApprovedByUserId` int;--> statement-breakpoint
ALTER TABLE `trip_suppliers` ADD `invoiceApprovedAt` timestamp;--> statement-breakpoint
ALTER TABLE `trip_suppliers` ADD `invoiceApprovalNote` varchar(500);