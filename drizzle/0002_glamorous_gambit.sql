CREATE TABLE `share_link_categories` (
	`share_link_id` text NOT NULL,
	`category_id` text NOT NULL,
	PRIMARY KEY(`share_link_id`, `category_id`),
	FOREIGN KEY (`share_link_id`) REFERENCES `share_links`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `share_links` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `share_links_code_unique` ON `share_links` (`code`);--> statement-breakpoint
DROP INDEX `categories_share_token_unique`;--> statement-breakpoint
ALTER TABLE `categories` DROP COLUMN `is_public`;--> statement-breakpoint
ALTER TABLE `categories` DROP COLUMN `share_token`;