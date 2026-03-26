CREATE TABLE `locationHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`technicianId` int NOT NULL,
	`taskId` int,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`speed` float,
	`heading` float,
	`accuracy` float,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `locationHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`taskId` int NOT NULL,
	`senderType` enum('dispatcher','technician','system') NOT NULL,
	`senderId` int,
	`senderName` varchar(255),
	`content` text NOT NULL,
	`attachmentType` enum('none','task_preview','file') DEFAULT 'none',
	`attachmentData` json,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pricingRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`model` enum('flat_rate','hourly','per_km','custom') NOT NULL,
	`flatRateCents` int,
	`hourlyBaseRateCents` int,
	`hourlyBaseMinutes` int DEFAULT 60,
	`hourlyOvertimeRateCents` int,
	`freeRadiusKm` decimal(6,2),
	`perKmRateCents` int,
	`customRules` json,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pricingRules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taskAuditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`taskId` int NOT NULL,
	`actorId` int,
	`actorType` enum('dispatcher','technician','system','customer'),
	`action` varchar(128) NOT NULL,
	`previousValue` json,
	`newValue` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taskAuditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`jobHash` varchar(64) NOT NULL,
	`status` enum('unassigned','assigned','en_route','on_site','completed','failed','cancelled') NOT NULL DEFAULT 'unassigned',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`templateId` int,
	`pricingRuleId` int,
	`technicianId` int,
	`customerName` varchar(255) NOT NULL,
	`customerPhone` varchar(32) NOT NULL,
	`customerEmail` varchar(320),
	`jobAddress` text NOT NULL,
	`jobLatitude` decimal(10,7),
	`jobLongitude` decimal(10,7),
	`pickupAddress` text,
	`pickupLatitude` decimal(10,7),
	`pickupLongitude` decimal(10,7),
	`description` text,
	`orderRef` varchar(128),
	`customFields` json,
	`pricingSnapshot` json,
	`totalCents` int,
	`geoClockIn` timestamp,
	`geoClockOut` timestamp,
	`timeOnSiteMin` int,
	`distanceTraveledKm` decimal(8,3),
	`scheduledAt` timestamp,
	`dispatchedAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`),
	CONSTRAINT `tasks_jobHash_unique` UNIQUE(`jobHash`)
);
--> statement-breakpoint
CREATE TABLE `technicians` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`tenantUserId` int NOT NULL,
	`status` enum('online','busy','on_break','offline') NOT NULL DEFAULT 'offline',
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`lastLocationAt` timestamp,
	`transportType` enum('car','van','truck','bike','foot') NOT NULL DEFAULT 'car',
	`skills` json,
	`hourlyRateCents` int DEFAULT 0,
	`photoUrl` varchar(500),
	`pushToken` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `technicians_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenantUsers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int,
	`role` enum('dispatcher','technician','manager','admin') NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(32),
	`passwordHash` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenantUsers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`industry` enum('hvac','construction','delivery','home_repair','it_repair','telecom','home_fitness','elder_care','electrical','plumbing','flooring','other') NOT NULL DEFAULT 'other',
	`plan` enum('starter','professional','enterprise') NOT NULL DEFAULT 'starter',
	`isActive` boolean NOT NULL DEFAULT true,
	`branding` json,
	`smsSenderName` varchar(64),
	`emailDomain` varchar(255),
	`tookanApiKey` varchar(255),
	`twilioAccountSid` varchar(64),
	`twilioAuthToken` varchar(64),
	`twilioPhoneNumber` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `workflowTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`industry` varchar(64),
	`description` text,
	`fields` json NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflowTemplates_id` PRIMARY KEY(`id`)
);
