// file: apps\playground-api\src\migrations\Migration20260624200950.ts

import { Migration } from '@mikro-orm/migrations';

export class Migration20260624200950 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table \`auth_banned_ips\` (\`id\` text not null primary key, \`ip_address\` text not null, \`reason\` text null, \`state\` text not null default 'active', \`banned_at\` datetime not null, \`banned_by_user_id\` text null, \`expires_at\` datetime null, \`revoked_at\` datetime null, \`metadata\` json null);`);
    this.addSql(`create index \`auth_banned_ips_ip_address_index\` on \`auth_banned_ips\` (\`ip_address\`);`);
    this.addSql(`create index \`auth_banned_ips_banned_at_index\` on \`auth_banned_ips\` (\`banned_at\`);`);
    this.addSql(`create index \`auth_banned_ips_expires_at_index\` on \`auth_banned_ips\` (\`expires_at\`);`);

    this.addSql(`create table \`auth_events\` (\`id\` text not null primary key, \`user_id\` text null, \`email\` text null, \`event_type\` text not null, \`ip_address\` text null, \`user_agent\` text null, \`success\` integer not null, \`failure_code\` text null, \`metadata\` json null, \`created_at\` datetime not null);`);
    this.addSql(`create index \`auth_events_user_id_index\` on \`auth_events\` (\`user_id\`);`);
    this.addSql(`create index \`auth_events_email_index\` on \`auth_events\` (\`email\`);`);
    this.addSql(`create index \`auth_events_event_type_index\` on \`auth_events\` (\`event_type\`);`);
    this.addSql(`create index \`auth_events_ip_address_index\` on \`auth_events\` (\`ip_address\`);`);
    this.addSql(`create index \`auth_events_success_index\` on \`auth_events\` (\`success\`);`);
    this.addSql(`create index \`auth_events_created_at_index\` on \`auth_events\` (\`created_at\`);`);

    this.addSql(`create table \`auth_refresh_tokens\` (\`id\` text not null primary key, \`user_id\` text not null, \`token_hash\` text not null, \`expires_at\` datetime not null, \`revoked_at\` datetime null, \`replaced_by_token_id\` text null, \`created_at\` datetime not null, \`created_by_ip\` text null, \`revoked_by_ip\` text null, \`user_agent\` text null);`);
    this.addSql(`create index \`auth_refresh_tokens_user_id_index\` on \`auth_refresh_tokens\` (\`user_id\`);`);
    this.addSql(`create index \`auth_refresh_tokens_token_hash_index\` on \`auth_refresh_tokens\` (\`token_hash\`);`);
    this.addSql(`create unique index \`auth_refresh_tokens_token_hash_unique\` on \`auth_refresh_tokens\` (\`token_hash\`);`);

    this.addSql(`create table \`auth_roles\` (\`id\` text not null primary key, \`name\` text not null, \`normalized_name\` text not null, \`description\` text null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`auth_roles_normalized_name_index\` on \`auth_roles\` (\`normalized_name\`);`);
    this.addSql(`create unique index \`auth_roles_normalized_name_unique\` on \`auth_roles\` (\`normalized_name\`);`);

    this.addSql(`create table \`auth_user_roles\` (\`id\` text not null primary key, \`user_id\` text not null, \`role_id\` text not null, \`role_name\` text not null, \`created_at\` datetime not null);`);
    this.addSql(`create index \`auth_user_roles_user_id_index\` on \`auth_user_roles\` (\`user_id\`);`);
    this.addSql(`create index \`auth_user_roles_role_id_index\` on \`auth_user_roles\` (\`role_id\`);`);
    this.addSql(`create index \`auth_user_roles_role_name_index\` on \`auth_user_roles\` (\`role_name\`);`);

    this.addSql(`create table \`auth_users\` (\`id\` text not null primary key, \`email\` text not null, \`normalized_email\` text not null, \`password_hash\` text not null, \`display_name\` text null, \`email_confirmed\` integer not null default false, \`state\` text not null default 'active', \`created_at\` datetime not null, \`updated_at\` datetime not null, \`last_login_at\` datetime null, \`avatar_url\` text null);`);

    this.addSql(`create table \`todos\` (\`id\` text not null primary key, \`title\` text not null, \`completed\` integer not null default false, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists \`auth_banned_ips\`;`);
    this.addSql(`drop table if exists \`auth_events\`;`);
    this.addSql(`drop table if exists \`auth_refresh_tokens\`;`);
    this.addSql(`drop table if exists \`auth_roles\`;`);
    this.addSql(`drop table if exists \`auth_user_roles\`;`);
    this.addSql(`drop table if exists \`auth_users\`;`);
    this.addSql(`drop table if exists \`todos\`;`);
  }

}
