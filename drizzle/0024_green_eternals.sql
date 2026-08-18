ALTER TABLE `trip_faqs` ADD `category` varchar(40) DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE `trip_faqs` ADD `category` varchar(40) DEFAULT 'general' NOT NULL;
--> statement-breakpoint
ALTER TABLE `trip_faqs` ADD `isPinned` boolean DEFAULT false NOT NULL;
