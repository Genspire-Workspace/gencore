import { Migration } from '@mikro-orm/migrations';

export class Migration20260627233000 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table \`ai_workspace_sessions\` (\`id\` text not null primary key, \`user_id\` text not null, \`title\` text null, \`type\` text not null default 'chat', \`default_timeline_id\` text null, \`settings\` json null, \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_workspace_sessions_user_updated_index\` on \`ai_workspace_sessions\` (\`user_id\`, \`updated_at\`);`);

    this.addSql(`create table \`ai_workspace_timelines\` (\`id\` text not null primary key, \`session_id\` text not null, \`name\` text null, \`is_default\` integer not null, \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_workspace_timelines_session_created_index\` on \`ai_workspace_timelines\` (\`session_id\`, \`created_at\`);`);

    this.addSql(`create table \`ai_workspace_turns\` (\`id\` text not null primary key, \`session_id\` text not null, \`status\` text not null, \`provider\` text null, \`model\` text null, \`started_at\` datetime null, \`finished_at\` datetime null, \`duration_ms\` integer null, \`finish_reason\` text null, \`error\` text null, \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_workspace_turns_session_created_index\` on \`ai_workspace_turns\` (\`session_id\`, \`created_at\`);`);

    this.addSql(`create table \`ai_workspace_timeline_turns\` (\`id\` text not null primary key, \`session_id\` text not null, \`timeline_id\` text not null, \`turn_id\` text not null, \`index\` integer not null, \`source\` text not null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_workspace_timeline_turns_timeline_index\` on \`ai_workspace_timeline_turns\` (\`timeline_id\`, \`index\`);`);
    this.addSql(`create unique index \`ai_workspace_timeline_turns_unique_timeline_index\` on \`ai_workspace_timeline_turns\` (\`timeline_id\`, \`index\`);`);

    this.addSql(`create table \`ai_workspace_messages\` (\`id\` text not null primary key, \`session_id\` text not null, \`turn_id\` text not null, \`index\` integer not null, \`role\` text not null, \`content\` json not null, \`name\` text null, \`provider\` text null, \`model\` text null, \`usage\` json null, \`tool_calls\` json null, \`tool_results\` json null, \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_workspace_messages_turn_index\` on \`ai_workspace_messages\` (\`turn_id\`, \`index\`);`);
    this.addSql(`create unique index \`ai_workspace_messages_unique_turn_index\` on \`ai_workspace_messages\` (\`turn_id\`, \`index\`);`);

    this.addSql(`create table \`ai_workspace_message_feedback\` (\`id\` text not null primary key, \`session_id\` text not null, \`message_id\` text not null, \`user_id\` text not null, \`rating\` text not null, \`comment\` text null, \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_workspace_message_feedback_message_created_index\` on \`ai_workspace_message_feedback\` (\`message_id\`, \`created_at\`);`);
    this.addSql(`create unique index \`ai_workspace_message_feedback_message_user_unique\` on \`ai_workspace_message_feedback\` (\`message_id\`, \`user_id\`);`);

    this.addSql(`create table \`ai_workspace_branches\` (\`id\` text not null primary key, \`session_id\` text not null, \`source_timeline_id\` text not null, \`source_turn_id\` text not null, \`source_turn_index\` integer not null, \`target_timeline_id\` text not null, \`reason\` text not null, \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_workspace_branches_session_created_index\` on \`ai_workspace_branches\` (\`session_id\`, \`created_at\`);`);

    this.addSql(`create table \`ai_workspace_generation_runs\` (\`id\` text not null primary key, \`session_id\` text not null, \`timeline_id\` text not null, \`turn_id\` text not null, \`status\` text not null, \`provider\` text null, \`model\` text null, \`started_at\` datetime null, \`finished_at\` datetime null, \`duration_ms\` integer null, \`finish_reason\` text null, \`usage\` json null, \`error\` text null, \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_workspace_generation_runs_session_created_index\` on \`ai_workspace_generation_runs\` (\`session_id\`, \`created_at\`);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists \`ai_workspace_generation_runs\`;`);
    this.addSql(`drop table if exists \`ai_workspace_branches\`;`);
    this.addSql(`drop table if exists \`ai_workspace_message_feedback\`;`);
    this.addSql(`drop table if exists \`ai_workspace_messages\`;`);
    this.addSql(`drop table if exists \`ai_workspace_timeline_turns\`;`);
    this.addSql(`drop table if exists \`ai_workspace_turns\`;`);
    this.addSql(`drop table if exists \`ai_workspace_timelines\`;`);
    this.addSql(`drop table if exists \`ai_workspace_sessions\`;`);
  }

}
