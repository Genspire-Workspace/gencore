import { Migration } from '@mikro-orm/migrations';

export class Migration20260624195327 extends Migration {

  override up(): void | Promise<void> {
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
    this.addSql(`drop table if exists \`auth_refresh_tokens\`;`);
    this.addSql(`drop table if exists \`auth_roles\`;`);
    this.addSql(`drop table if exists \`auth_user_roles\`;`);
    this.addSql(`drop table if exists \`auth_users\`;`);
    this.addSql(`drop table if exists \`todos\`;`);
  }

}
