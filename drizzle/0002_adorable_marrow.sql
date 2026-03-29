CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int,
	`actorId` varchar(128) NOT NULL,
	`actorEmail` varchar(320) NOT NULL,
	`actorRole` varchar(64) NOT NULL,
	`action` varchar(128) NOT NULL,
	`targetType` varchar(64),
	`targetId` varchar(128),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendarItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`createdByUserId` int,
	`type` enum('note','task','event','work_order') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`date` varchar(10) NOT NULL,
	`time` varchar(5),
	`endTime` varchar(5),
	`taskId` int,
	`color` varchar(7),
	`isCompleted` boolean DEFAULT false,
	`externalEventId` varchar(255),
	`externalCalendarType` enum('google','microsoft'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendarItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklistItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checklistId` int NOT NULL,
	`tenantId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`label` varchar(512) NOT NULL,
	`required` boolean NOT NULL DEFAULT false,
	`itemType` enum('checkbox','photo','voice','note','signature','payment') NOT NULL DEFAULT 'checkbox',
	`isChecked` boolean NOT NULL DEFAULT false,
	`checkedAt` timestamp,
	`checkedByUserId` int,
	`note` text,
	`photoUrl` text,
	`voiceNoteUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checklistItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consentRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`policyVersion` varchar(16) NOT NULL,
	`consentGiven` boolean NOT NULL DEFAULT false,
	`ipAddress` varchar(45),
	`userAgent` text,
	`consentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consentRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`company` varchar(255) NOT NULL,
	`contactName` varchar(255),
	`email` varchar(320),
	`phone` varchar(32),
	`mailingStreet` varchar(255),
	`mailingCity` varchar(128),
	`mailingProvince` varchar(64),
	`mailingPostalCode` varchar(20),
	`mailingCountry` varchar(64) DEFAULT 'Canada',
	`physicalStreet` varchar(255),
	`physicalCity` varchar(128),
	`physicalProvince` varchar(64),
	`physicalPostalCode` varchar(20),
	`physicalCountry` varchar(64) DEFAULT 'Canada',
	`sameAsMailing` boolean DEFAULT false,
	`industry` varchar(64),
	`status` enum('active','prospect','inactive','vip') NOT NULL DEFAULT 'prospect',
	`paymentTerms` varchar(64) DEFAULT 'net_30',
	`creditLimit` int DEFAULT 0,
	`taxExempt` boolean DEFAULT false,
	`taxNumber` varchar(64),
	`tags` text,
	`notes` text,
	`totalRevenueCents` int DEFAULT 0,
	`jobCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fileAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`uploadedByUserId` int,
	`entityType` enum('task','customer','technician','message') NOT NULL,
	`entityId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileSize` int,
	`mimeType` varchar(128),
	`url` varchar(1000) NOT NULL,
	`storageProvider` varchar(32) DEFAULT 's3',
	`externalFileId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fileAttachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integrationConfigs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`integrationKey` varchar(64) NOT NULL,
	`isConnected` boolean NOT NULL DEFAULT false,
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`config` json,
	`lastSyncAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrationConfigs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `merchantSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`preferences` json,
	`theme` json,
	`notifications` json,
	`autoAllocation` boolean NOT NULL DEFAULT false,
	`smsConfig` json,
	`emailConfig` json,
	`templates` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `merchantSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `merchantSettings_tenantId_unique` UNIQUE(`tenantId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`recipientUserId` int NOT NULL,
	`type` enum('job_assigned','job_updated','job_completed','message_received','alert','system') NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text,
	`deepLink` varchar(500),
	`entityType` enum('task','message','technician','customer'),
	`entityId` int,
	`pushStatus` enum('pending','sent','failed','not_applicable') DEFAULT 'pending',
	`pushToken` varchar(255),
	`readAt` timestamp,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taskChecklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`taskId` int NOT NULL,
	`title` varchar(255) NOT NULL DEFAULT 'Work Order Checklist',
	`templateName` varchar(128),
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`completedByUserId` int,
	`signatureUrl` text,
	`signedAt` timestamp,
	`signedByName` varchar(255),
	`paymentAuthorized` boolean DEFAULT false,
	`paymentAmountCents` int,
	`paymentMethod` varchar(64),
	`paymentAuthorizedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `taskChecklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `technicianSkills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`technicianId` int NOT NULL,
	`skill` varchar(128) NOT NULL,
	`proficiencyLevel` enum('beginner','intermediate','expert') DEFAULT 'intermediate',
	`certifiedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `technicianSkills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userMerchantAccess` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tenantId` int NOT NULL,
	`grantedBy` int NOT NULL,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userMerchantAccess_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('super_admin','nvc_manager','merchant_manager','agent','user','admin') NOT NULL DEFAULT 'agent';--> statement-breakpoint
ALTER TABLE `technicians` ADD `clockInAt` timestamp;--> statement-breakpoint
ALTER TABLE `technicians` ADD `clockInLat` decimal(10,7);--> statement-breakpoint
ALTER TABLE `technicians` ADD `clockInLng` decimal(10,7);--> statement-breakpoint
ALTER TABLE `technicians` ADD `clockOutAt` timestamp;--> statement-breakpoint
ALTER TABLE `technicians` ADD `clockOutLat` decimal(10,7);--> statement-breakpoint
ALTER TABLE `technicians` ADD `clockOutLng` decimal(10,7);--> statement-breakpoint
ALTER TABLE `technicians` ADD `todayMinutesWorked` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tenantUsers` ADD `googleId` varchar(255);--> statement-breakpoint
ALTER TABLE `tenants` ADD `isNvcPlatform` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tenants` ADD `suspended` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_taskId_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_technicianId_technicians_id_fk` FOREIGN KEY (`technicianId`) REFERENCES `technicians`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `technicians` ADD CONSTRAINT `technicians_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `technicians` ADD CONSTRAINT `technicians_tenantUserId_tenantUsers_id_fk` FOREIGN KEY (`tenantUserId`) REFERENCES `tenantUsers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenantUsers` ADD CONSTRAINT `tenantUsers_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;