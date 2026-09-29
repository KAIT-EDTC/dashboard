CREATE TABLE `activity_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`author_id` text NOT NULL,
	`division` text,
	`content` text DEFAULT '' NOT NULL,
	`reflection` text DEFAULT '' NOT NULL,
	`rating` integer,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`submitted_at` text,
	`reviewer_id` text,
	`reviewed_at` text,
	`rejection_fields` text DEFAULT '[]' NOT NULL,
	`rejection_comment` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_reports_event_author_idx` ON `activity_reports` (`event_id`,`author_id`);--> statement-breakpoint
CREATE INDEX `activity_reports_author_idx` ON `activity_reports` (`author_id`);--> statement-breakpoint
CREATE INDEX `activity_reports_status_division_idx` ON `activity_reports` (`status`,`division`);--> statement-breakpoint
ALTER TABLE `event_participants` ADD `role` text DEFAULT 'assistant' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `head_of` text DEFAULT '[]' NOT NULL;