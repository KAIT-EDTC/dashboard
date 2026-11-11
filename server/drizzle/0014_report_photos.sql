CREATE TABLE `report_photos` (
	`report_id` text NOT NULL,
	`file_name` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`report_id`, `file_name`),
	FOREIGN KEY (`report_id`) REFERENCES `activity_reports`(`id`) ON UPDATE no action ON DELETE cascade
);
