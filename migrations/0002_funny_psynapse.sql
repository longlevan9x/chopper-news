DROP INDEX `app_secrets_key_name_unique`;--> statement-breakpoint
ALTER TABLE `app_secrets` ADD `chat_id` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `app_secrets_chat_id_key_name_unique` ON `app_secrets` (`chat_id`,`key_name`);