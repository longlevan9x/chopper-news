CREATE TABLE `app_secrets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key_name` text NOT NULL,
	`key_value` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now', 'localtime'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_secrets_key_name_unique` ON `app_secrets` (`key_name`);