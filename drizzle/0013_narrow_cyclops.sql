ALTER TABLE `rounds` ADD `mercyRuleEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `rounds` ADD `mercyRuleStrokes` int DEFAULT 5 NOT NULL;