CREATE TABLE `notification_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`webhook_url` text,
	`on_event_created` integer DEFAULT true NOT NULL,
	`on_blog_submitted` integer DEFAULT true NOT NULL,
	`on_blog_published` integer DEFAULT true NOT NULL,
	`on_blog_closed` integer DEFAULT true NOT NULL,
	`on_blog_feedback` integer DEFAULT true NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
