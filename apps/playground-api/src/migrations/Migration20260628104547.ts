// file: apps\playground-api\src\migrations\Migration20260628104547.ts

import { Migration } from '@mikro-orm/migrations';

export class Migration20260628104547 extends Migration {

  override up(): void | Promise<void> {
    this.addSql(`create table \`ai_provider_api_keys\` (\`id\` text not null primary key, \`provider_id\` text not null, \`user_id\` text not null, \`name\` text not null, \`value\` text null, \`env\` text null, \`enabled\` integer not null default true, \`source\` text not null default 'user', \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_provider_api_keys_provider_user_index\` on \`ai_provider_api_keys\` (\`provider_id\`, \`user_id\`);`);
    this.addSql(`create unique index \`ai_provider_api_keys_provider_user_unique\` on \`ai_provider_api_keys\` (\`provider_id\`, \`user_id\`);`);

    this.addSql(`create table \`ai_models\` (\`id\` text not null primary key, \`provider_id\` text not null, \`name\` text not null, \`family\` text null, \`capabilities\` json null, \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_models_provider_name_index\` on \`ai_models\` (\`provider_id\`, \`name\`);`);
    this.addSql(`create unique index \`ai_models_provider_name_unique\` on \`ai_models\` (\`provider_id\`, \`name\`);`);

    this.addSql(`create table \`ai_providers\` (\`id\` text not null primary key, \`name\` text not null, \`kind\` text not null default 'custom', \`client_kind\` text not null default 'openai-compatible', \`base_url\` text null, \`api\` text null, \`doc\` text null, \`website\` text null, \`metadata\` json null, \`created_at\` datetime not null, \`updated_at\` datetime not null);`);
    this.addSql(`create index \`ai_providers_client_kind_index\` on \`ai_providers\` (\`client_kind\`);`);
    this.addSql(`create unique index \`ai_providers_name_unique\` on \`ai_providers\` (\`name\`);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists \`ai_provider_api_keys\`;`);
    this.addSql(`drop table if exists \`ai_models\`;`);
    this.addSql(`drop table if exists \`ai_providers\`;`);
  }

}
