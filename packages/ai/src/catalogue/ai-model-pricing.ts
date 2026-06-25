export type AiPricingUnit =
  | "token"
  | "request"
  | "image"
  | "second"
  | "character";

export interface IAiTokenPricing {
  inputPerMillion?: number;
  outputPerMillion?: number;
  cacheReadPerMillion?: number;
  cacheWritePerMillion?: number;
  reasoningOutputPerMillion?: number;
}

export interface IAiModelPricing {
  currency: "USD" | "EUR" | string;
  unit: AiPricingUnit;
  tokens?: IAiTokenPricing;
  requestPrice?: number;
  imagePrice?: number;
  audioSecondPrice?: number;
  notes?: string;
}
