CREATE TABLE `blog_series` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blog_series_label_unique` ON `blog_series` (`label`);--> statement-breakpoint
CREATE TABLE `event_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`tone` text DEFAULT 'neutral' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_categories_label_unique` ON `event_categories` (`label`);--> statement-breakpoint
INSERT INTO `blog_series` (`id`, `label`, `sort_order`) VALUES
	('yugyou', '遊行塾', 0),
	('event', 'イベント', 1),
	('outreach', '対外活動', 2),
	('play', '遊び', 3),
	('other', 'その他', 4);
--> statement-breakpoint
INSERT INTO `event_categories` (`id`, `label`, `tone`, `sort_order`) VALUES
	('activity', '活動', 'accent', 0),
	('outreach', '対外活動', 'success', 1),
	('meeting', 'ミーティング', 'neutral', 2),
	('social', '親睦', 'warning', 3),
	('other', 'その他', 'neutral', 4);
