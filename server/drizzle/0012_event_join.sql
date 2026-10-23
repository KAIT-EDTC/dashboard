CREATE TABLE `event_join_divisions` (
	`event_id` text NOT NULL,
	`division` text NOT NULL,
	PRIMARY KEY(`event_id`, `division`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `event_join_users` (
	`event_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`event_id`, `user_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_join_users_user_idx` ON `event_join_users` (`user_id`);--> statement-breakpoint
ALTER TABLE `events` ADD `join_restricted` integer DEFAULT false NOT NULL;