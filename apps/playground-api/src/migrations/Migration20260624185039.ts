import { Migration } from '@mikro-orm/migrations';

export class Migration20260624185039 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table \`auth_refresh_tokens\` (\`id\` text not null primary key, \`user_id\` text not null, \`token_hash\` text not null, \`expires_at\` datetime not null, \`revoked_at\` datetime null, \`replaced_by_token_id\` text null, \`created_at\` datetime not null, \`created_by_ip\` text null, \`revoked_by_ip\` text null, \`user_agent\` text null);`);
    this.addSql(`create index \`auth_refresh_tokens_user_id_index\` on \`auth_refresh_tokens\` (\`user_id\`);`);
    this.addSql(`create index \`auth_refresh_tokens_token_hash_index\` on \`auth_refresh_tokens\` (\`token_hash\`);`);
    this.addSql(`create unique index \`auth_refresh_tokens_token_hash_unique\` on \`auth_refresh_tokens\` (\`token_hash\`);`);

    this.addSql(`create table \`auth_users\` (\`id\` text not null primary key, \`email\` text not null, \`normalized_email\` text not null, \`password_hash\` text not null, \`display_name\` text null, \`email_confirmed\` integer not null default false, \`state\` text not null default 'active', \`created_at\` datetime not null, \`updated_at\` datetime not null, \`last_login_at\` datetime null, \`avatar_url\` text null);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists \`auth_refresh_tokens\`;`);
    this.addSql(`drop table if exists \`auth_users\`;`);
  }

}
