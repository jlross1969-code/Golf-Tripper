ALTER TABLE `trip_documents` ADD `folder` varchar(120) DEFAULT 'General' NOT NULL;--> statement-breakpoint
ALTER TABLE `trip_documents` ADD `tags` varchar(500);--> statement-breakpoint
ALTER TABLE `trip_suppliers` ADD `invoiceAttachmentKey` varchar(512);--> statement-breakpoint
ALTER TABLE `trip_suppliers` ADD `invoiceAttachmentUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `trip_suppliers` ADD `invoiceAttachmentFileName` varchar(255);--> statement-breakpoint
ALTER TABLE `trips` ADD `financialDigestEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `trips` ADD `financialDigestHourUtc` int DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE `trips` ADD `financialDigestCronTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `trips` ADD `financialDigestLastSentAt` timestamp;