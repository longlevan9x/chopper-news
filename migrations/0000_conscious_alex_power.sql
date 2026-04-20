CREATE TABLE `summaries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chat_id` integer NOT NULL,
	`user_name` text,
	`url` text NOT NULL,
	`domain` text,
	`title` text,
	`status` text DEFAULT 'success',
	`error_message` text,
	`original_length` integer,
	`content_snippet` text,
	`summary` text,
	`created_at` text DEFAULT (datetime('now', 'localtime'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `summaries_chat_id_url_unique` ON `summaries` (`chat_id`,`url`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`chat_id` integer PRIMARY KEY NOT NULL,
	`preferred_provider` text DEFAULT 'groq',
	`updated_at` text DEFAULT (datetime('now', 'localtime'))
);
