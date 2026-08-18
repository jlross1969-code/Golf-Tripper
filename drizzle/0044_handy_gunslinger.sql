ALTER TABLE `trip_documents` ADD `expiryReminderAt` timestamp;--> statement-breakpoint
ALTER TABLE `trip_documents` ADD `expiryReminderCronTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `trip_documents` ADD `expiryReminderSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `trip_financial_settings` ADD `budgetWarningThresholdPercent` float DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `trip_financial_settings` ADD `budgetWarningSentAt` timestamp;