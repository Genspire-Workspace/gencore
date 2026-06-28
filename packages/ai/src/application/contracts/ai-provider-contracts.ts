// file: packages\ai\src\application\contracts\ai-provider-contracts.ts

import type { ICurrentUser } from "@genspire/auth";
import type { AiProviderClientKind } from "../../providers/ai-provider-client-kind.js";
import type { AiProviderKind } from "../../domain/models/ai-provider.js";
import type { IAiModelCapabilities } from "../../domain/models/ai-model-capabilities.js";
import type { AiApiKeySource } from "../../domain/models/ai-api-key.js";

export interface ICreateAiProviderInput {
  currentUser: ICurrentUser;
  id?: string;
  name: string;
  kind: AiProviderKind;
  clientKind: AiProviderClientKind;
  baseUrl?: string | null;
  api?: string | null;
  doc?: string | null;
  website?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface IUpdateAiProviderInput {
  currentUser: ICurrentUser;
  providerId: string;
  name?: string;
  kind?: AiProviderKind;
  clientKind?: AiProviderClientKind;
  baseUrl?: string | null;
  api?: string | null;
  doc?: string | null;
  website?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ICreateAiModelInput {
  currentUser: ICurrentUser;
  providerId: string;
  name: string;
  family?: string | null;
  capabilities?: IAiModelCapabilities | null;
  metadata?: Record<string, unknown> | null;
}

export interface IUpdateAiModelInput {
  currentUser: ICurrentUser;
  modelId: string;
  name?: string;
  family?: string | null;
  capabilities?: IAiModelCapabilities | null;
  metadata?: Record<string, unknown> | null;
}

export interface ICreateAiApiKeyInput {
  currentUser: ICurrentUser;
  providerId: string;
  name: string;
  value?: string | null;
  env?: string | null;
  enabled?: boolean;
  source?: AiApiKeySource;
  metadata?: Record<string, unknown> | null;
}

export interface IUpdateAiApiKeyInput {
  currentUser: ICurrentUser;
  apiKeyId: string;
  name?: string;
  value?: string | null;
  env?: string | null;
  enabled?: boolean;
  source?: AiApiKeySource;
  metadata?: Record<string, unknown> | null;
}