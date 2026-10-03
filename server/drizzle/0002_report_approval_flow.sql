PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_activity_reports` (
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
	`approval_steps` text DEFAULT '[]' NOT NULL,
	`current_step` integer DEFAULT 0 NOT NULL,
	`approved_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_activity_reports`("id", "event_id", "author_id", "division", "content", "reflection", "rating", "notes", "status", "submitted_at", "approved_at", "created_at", "updated_at") SELECT "id", "event_id", "author_id", "division", "content", "reflection", "rating", "notes", CASE WHEN "status" = 'submitted' THEN 'draft' ELSE "status" END, "submitted_at", CASE WHEN "status" = 'approved' THEN "reviewed_at" END, "created_at", "updated_at" FROM `activity_reports`;--> statement-breakpoint
DROP TABLE `activity_reports`;--> statement-breakpoint
ALTER TABLE `__new_activity_reports` RENAME TO `activity_reports`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `activity_reports_event_author_idx` ON `activity_reports` (`event_id`,`author_id`);--> statement-breakpoint
CREATE INDEX `activity_reports_author_idx` ON `activity_reports` (`author_id`);--> statement-breakpoint
CREATE INDEX `activity_reports_status_division_idx` ON `activity_reports` (`status`,`division`);--> statement-breakpoint
ALTER TABLE `users` ADD `officer` text;--> statement-breakpoint
CREATE TABLE `activity_report_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`field` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`quote` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `activity_report_reviews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activity_report_comments_review_idx` ON `activity_report_comments` (`review_id`);--> statement-breakpoint
CREATE TABLE `activity_report_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`reviewer_id` text,
	`step` text NOT NULL,
	`decision` text NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `activity_reports`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `activity_report_reviews_report_idx` ON `activity_report_reviews` (`report_id`);
