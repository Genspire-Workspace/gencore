export interface IPlaygroundAngularEnv {
  apiBaseUrl: string;
  defaultAiProvider: string;
  defaultAiModel: string;
}

const globalConfig = globalThis as {
  __PLAYGROUND_API_BASE_URL__?: string;
  __PLAYGROUND_AI_PROVIDER__?: string;
  __PLAYGROUND_AI_MODEL__?: string;
};

export const appEnv: IPlaygroundAngularEnv = {
  apiBaseUrl:
    globalConfig.__PLAYGROUND_API_BASE_URL__?.trim() ||
    'http://localhost:3000',
  defaultAiProvider:
    globalConfig.__PLAYGROUND_AI_PROVIDER__?.trim() || 'ollama',
  defaultAiModel:
    globalConfig.__PLAYGROUND_AI_MODEL__?.trim() || 'gemma4:12b',
};
