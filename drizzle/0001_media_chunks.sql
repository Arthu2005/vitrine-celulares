CREATE TABLE `media_chunks` (
	`key` text NOT NULL,
	`part` integer NOT NULL,
	`data` blob NOT NULL,
	PRIMARY KEY(`key`, `part`)
);
