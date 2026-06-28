import { Migration } from '@mikro-orm/migrations';

export class Migration20260628094907 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table \`ai_session_generation_runs\` (\`id\` text not null primary key, \`session_id\` text not null, \`timeline_id\` text not null, \`turn_id\` text not null, \`status\` text not null default 'running', \`provider\` text null, \`model\` text null, \`started_at\` datetime null, \`finished_at\` datetime null, \`duration_ms\` integer null, \`finish_reason\` text null, \`usage\` json null, \`error\` text null, \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_session_generation_runs_session_created_index\` on \`ai_session_generation_runs\` (\`session_id\`, \`created_at\`);`);

    this.addSql(`create table \`ai_prompts\` (\`id\` text not null primary key, \`user_id\` text null, \`visibility\` text not null default 'private', \`name\` text not null, \`description\` text null, \`argument_hint\` text null, \`version\` text null, \`template\` json not null, \`variables\` json null, \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_prompts_name_index\` on \`ai_prompts\` (\`name\`);`);
    this.addSql(`create index \`ai_prompts_visibility_index\` on \`ai_prompts\` (\`visibility\`);`);
    this.addSql(`create index \`ai_prompts_user_id_index\` on \`ai_prompts\` (\`user_id\`);`);

    this.addSql(`create table \`ai_session_branches\` (\`id\` text not null primary key, \`session_id\` text not null, \`source_timeline_id\` text not null, \`source_turn_id\` text not null, \`source_turn_index\` integer not null, \`target_timeline_id\` text not null, \`reason\` text not null, \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_session_branches_session_created_index\` on \`ai_session_branches\` (\`session_id\`, \`created_at\`);`);

    this.addSql(`create table \`ai_session_sessions\` (\`id\` text not null primary key, \`user_id\` text not null, \`title\` text null, \`type\` text not null default 'chat', \`default_timeline_id\` text null, \`settings\` json null, \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_session_sessions_user_updated_index\` on \`ai_session_sessions\` (\`user_id\`, \`updated_at\`);`);

    this.addSql(`create table \`ai_session_messages\` (\`id\` text not null primary key, \`session_id\` text not null, \`turn_id\` text not null, \`index\` integer not null, \`role\` text not null, \`content\` json not null, \`name\` text null, \`provider\` text null, \`model\` text null, \`usage\` json null, \`tool_calls\` json null, \`tool_results\` json null, \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_session_messages_turn_index\` on \`ai_session_messages\` (\`turn_id\`, \`index\`);`);
    this.addSql(`create unique index \`ai_session_messages_unique_turn_index\` on \`ai_session_messages\` (\`turn_id\`, \`index\`);`);

    this.addSql(`create table \`ai_session_message_feedback\` (\`id\` text not null primary key, \`session_id\` text not null, \`message_id\` text not null, \`user_id\` text not null, \`rating\` text not null, \`comment\` text null, \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_session_message_feedback_message_created_index\` on \`ai_session_message_feedback\` (\`message_id\`, \`created_at\`);`);
    this.addSql(`create unique index \`ai_session_message_feedback_message_user_unique\` on \`ai_session_message_feedback\` (\`message_id\`, \`user_id\`);`);

    this.addSql(`create table \`ai_session_timelines\` (\`id\` text not null primary key, \`session_id\` text not null, \`name\` text null, \`is_default\` integer not null default false, \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_session_timelines_session_created_index\` on \`ai_session_timelines\` (\`session_id\`, \`created_at\`);`);

    this.addSql(`create table \`ai_session_timeline_turns\` (\`id\` text not null primary key, \`session_id\` text not null, \`timeline_id\` text not null, \`turn_id\` text not null, \`index\` integer not null, \`source\` text not null default 'original', \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_session_timeline_turns_timeline_index\` on \`ai_session_timeline_turns\` (\`timeline_id\`, \`index\`);`);
    this.addSql(`create unique index \`ai_session_timeline_turns_unique_timeline_index\` on \`ai_session_timeline_turns\` (\`timeline_id\`, \`index\`);`);

    this.addSql(`create table \`ai_session_turns\` (\`id\` text not null primary key, \`session_id\` text not null, \`status\` text not null default 'running', \`provider\` text null, \`model\` text null, \`started_at\` datetime null, \`finished_at\` datetime null, \`duration_ms\` integer null, \`finish_reason\` text null, \`error\` text null, \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_session_turns_session_created_index\` on \`ai_session_turns\` (\`session_id\`, \`created_at\`);`);

    this.addSql(`create table \`ai_skills\` (\`id\` text not null primary key, \`user_id\` text null, \`visibility\` text not null default 'private', \`name\` text not null, \`description\` text not null, \`instructions\` text null, \`compatibility\` text null, \`license\` text null, \`metadata\` json null, \`allowed_tools\` json null, \`disable_model_invocation\` integer not null default false, \`execution_mode\` text not null default 'server', \`bundle_format\` text not null default 'inline', \`bundle_storage_file_id\` text null, \`manifest\` json null, \`registered\` integer not null default true, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_skills_name_index\` on \`ai_skills\` (\`name\`);`);
    this.addSql(`create index \`ai_skills_execution_mode_index\` on \`ai_skills\` (\`execution_mode\`);`);
    this.addSql(`create index \`ai_skills_visibility_index\` on \`ai_skills\` (\`visibility\`);`);
    this.addSql(`create index \`ai_skills_user_id_index\` on \`ai_skills\` (\`user_id\`);`);

    this.addSql(`create table \`auth_banned_ips\` (\`id\` text not null primary key, \`ip_address\` text not null, \`reason\` text null, \`state\` text not null default 'active', \`created_at\` datetime not null, \`banned_at\` datetime not null, \`banned_by_user_id\` text null, \`expires_at\` datetime null, \`revoked_at\` datetime null, \`metadata\` json null);`);
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

    this.addSql(`create table \`auth_user_ips\` (\`id\` text not null primary key, \`user_id\` text not null, \`ip_address\` text not null, \`created_at\` datetime not null, \`last_seen_at\` datetime not null, \`seen_count\` integer not null default 1, \`user_agent\` text null, \`metadata\` json null);`);
    this.addSql(`create index \`auth_user_ips_user_id_index\` on \`auth_user_ips\` (\`user_id\`);`);
    this.addSql(`create index \`auth_user_ips_ip_address_index\` on \`auth_user_ips\` (\`ip_address\`);`);
    this.addSql(`create index \`auth_user_ips_created_at_index\` on \`auth_user_ips\` (\`created_at\`);`);
    this.addSql(`create index \`auth_user_ips_last_seen_at_index\` on \`auth_user_ips\` (\`last_seen_at\`);`);
    this.addSql(`create unique index \`auth_user_ips_user_id_ip_address_unique\` on \`auth_user_ips\` (\`user_id\`, \`ip_address\`);`);

    this.addSql(`create table \`auth_user_roles\` (\`id\` text not null primary key, \`user_id\` text not null, \`role_id\` text not null, \`role_name\` text not null, \`created_at\` datetime not null);`);
    this.addSql(`create index \`auth_user_roles_user_id_index\` on \`auth_user_roles\` (\`user_id\`);`);
    this.addSql(`create index \`auth_user_roles_role_id_index\` on \`auth_user_roles\` (\`role_id\`);`);
    this.addSql(`create index \`auth_user_roles_role_name_index\` on \`auth_user_roles\` (\`role_name\`);`);

    this.addSql(`create table \`files\` (\`id\` text not null primary key, \`bucket\` text not null, \`key\` text not null, \`original_name\` text not null, \`content_type\` text null, \`size\` integer not null, \`etag\` text null, \`metadata\` json null, \`uploaded_by\` text null, \`uploader_ip\` text null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);

    this.addSql(`create table \`auth_users\` (\`id\` text not null primary key, \`email\` text not null, \`normalized_email\` text not null, \`password_hash\` text not null, \`display_name\` text null, \`email_confirmed\` integer not null default false, \`state\` text not null default 'active', \`created_at\` datetime not null, \`updated_at\` datetime not null, \`last_login_at\` datetime null, \`avatar_url\` text null);`);

    this.addSql(`create table \`todos\` (\`id\` text not null primary key, \`title\` text not null, \`completed\` integer not null default false, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists \`ai_session_generation_runs\`;`);
    this.addSql(`drop table if exists \`ai_prompts\`;`);
    this.addSql(`drop table if exists \`ai_session_branches\`;`);
    this.addSql(`drop table if exists \`ai_session_sessions\`;`);
    this.addSql(`drop table if exists \`ai_session_messages\`;`);
    this.addSql(`drop table if exists \`ai_session_message_feedback\`;`);
    this.addSql(`drop table if exists \`ai_session_timelines\`;`);
    this.addSql(`drop table if exists \`ai_session_timeline_turns\`;`);
    this.addSql(`drop table if exists \`ai_session_turns\`;`);
    this.addSql(`drop table if exists \`ai_skills\`;`);
    this.addSql(`drop table if exists \`auth_banned_ips\`;`);
    this.addSql(`drop table if exists \`auth_events\`;`);
    this.addSql(`drop table if exists \`auth_refresh_tokens\`;`);
    this.addSql(`drop table if exists \`auth_roles\`;`);
    this.addSql(`drop table if exists \`auth_user_ips\`;`);
    this.addSql(`drop table if exists \`auth_user_roles\`;`);
    this.addSql(`drop table if exists \`files\`;`);
    this.addSql(`drop table if exists \`auth_users\`;`);
    this.addSql(`drop table if exists \`todos\`;`);
  }

}
