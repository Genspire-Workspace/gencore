export type AiProviderProtocol =
  | "openai-chat-completions"
  | "openai-responses"
  | "openai-embeddings"
  | "anthropic-messages"
  | "google-generative-ai"
  | "google-vertex"
  | "mistral-chat"
  | "cohere-chat"
  | "bedrock-converse"
  | "ollama-chat"
  | "ollama-embeddings"
  | "openai-compatible"
  | "anthropic-compatible"
  | "custom";

export type AiProviderProtocolFamily =
  | "openai"
  | "anthropic"
  | "google"
  | "mistral"
  | "cohere"
  | "bedrock"
  | "ollama"
  | "custom";

export interface IAiProviderProtocolDescriptor {
  id: AiProviderProtocol;
  displayName: string;
  family: AiProviderProtocolFamily;
  supportsChat?: boolean;
  supportsEmbeddings?: boolean;
  supportsStreaming?: boolean;
  supportsTools?: boolean;
  supportsReasoning?: boolean;
  supportsVision?: boolean;
}

export const AI_PROVIDER_PROTOCOLS = [
  {
    id: "openai-chat-completions",
    displayName: "OpenAI Chat Completions",
    family: "openai",
    supportsChat: true,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: "openai-responses",
    displayName: "OpenAI Responses",
    family: "openai",
    supportsChat: true,
    supportsStreaming: true,
    supportsTools: true,
    supportsReasoning: true,
    supportsVision: true,
  },
  {
    id: "openai-embeddings",
    displayName: "OpenAI Embeddings",
    family: "openai",
    supportsEmbeddings: true,
  },
  {
    id: "anthropic-messages",
    displayName: "Anthropic Messages",
    family: "anthropic",
    supportsChat: true,
    supportsStreaming: true,
    supportsTools: true,
    supportsReasoning: true,
    supportsVision: true,
  },
  {
    id: "google-generative-ai",
    displayName: "Google Generative AI",
    family: "google",
    supportsChat: true,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: "google-vertex",
    displayName: "Google Vertex AI",
    family: "google",
    supportsChat: true,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: "mistral-chat",
    displayName: "Mistral Chat",
    family: "mistral",
    supportsChat: true,
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: "cohere-chat",
    displayName: "Cohere Chat",
    family: "cohere",
    supportsChat: true,
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: "bedrock-converse",
    displayName: "Amazon Bedrock Converse",
    family: "bedrock",
    supportsChat: true,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: "ollama-chat",
    displayName: "Ollama Chat",
    family: "ollama",
    supportsChat: true,
    supportsStreaming: true,
  },
  {
    id: "ollama-embeddings",
    displayName: "Ollama Embeddings",
    family: "ollama",
    supportsEmbeddings: true,
  },
  {
    id: "openai-compatible",
    displayName: "OpenAI-Compatible",
    family: "openai",
    supportsChat: true,
    supportsEmbeddings: true,
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: "anthropic-compatible",
    displayName: "Anthropic-Compatible",
    family: "anthropic",
    supportsChat: true,
    supportsStreaming: true,
    supportsTools: true,
  },
  {
    id: "custom",
    displayName: "Custom",
    family: "custom",
  },
] as const satisfies readonly IAiProviderProtocolDescriptor[];
