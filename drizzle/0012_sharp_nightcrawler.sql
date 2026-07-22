ALTER TABLE `trips` ADD `tripPlanTier` enum('free','tripPass','clubPlan') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `trips` ADD `planActivatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `trips` ADD `stripePaymentIntentId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `planTier` enum('free','playerPremium','clubPlan') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` enum('none','active','trialing','cancelled') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(64);