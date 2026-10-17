CREATE TABLE `event_shift_members` (
	`shift_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`shift_id`, `user_id`),
	FOREIGN KEY (`shift_id`) REFERENCES `event_shifts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_shift_members_user_idx` ON `event_shift_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `event_shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`label` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_shifts_event_idx` ON `event_shifts` (`event_id`,`starts_at`);--> statement-breakpoint
ALTER TABLE `event_participants` ADD `unavailable` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `has_shifts` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `shift_start_hour` integer;--> statement-breakpoint
ALTER TABLE `events` ADD `shift_end_hour` integer;--> statement-breakpoint
ALTER TABLE `events` ADD `shift_split_hour` integer;