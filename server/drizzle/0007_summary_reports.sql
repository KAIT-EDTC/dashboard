DROP INDEX `activity_reports_event_author_idx`;--> statement-breakpoint
ALTER TABLE `activity_reports` ADD `kind` text DEFAULT 'activity' NOT NULL;--> statement-breakpoint
ALTER TABLE `activity_reports` ADD `hosting` text;--> statement-breakpoint
ALTER TABLE `activity_reports` ADD `analyses` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `activity_reports` ADD `overview` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `activity_reports` ADD `impressions` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `activity_reports_event_summary_idx` ON `activity_reports` (`event_id`) WHERE kind = 'summary';--> statement-breakpoint
CREATE UNIQUE INDEX `activity_reports_event_author_idx` ON `activity_reports` (`event_id`,`author_id`,`kind`);--> statement-breakpoint
ALTER TABLE `events` ADD `summary_writer_id` text REFERENCES users(id) ON DELETE set null;