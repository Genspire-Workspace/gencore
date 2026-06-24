export class EnvService {
  get(key: string, defaultValue?: string): string | undefined {
    return process.env[key] ?? defaultValue;
  }

  require(key: string): string {
    const value = this.get(key);
    if (value == null || value === "") {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  getNumber(key: string, defaultValue?: number): number | undefined {
    const value = this.get(key);
    if (value == null || value === "") {
      return defaultValue;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error(`Environment variable ${key} is not a valid number.`);
    }

    return parsed;
  }

  requireNumber(key: string): number {
    const value = this.getNumber(key);
    if (value == null) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  getBoolean(key: string, defaultValue?: boolean): boolean | undefined {
    const value = this.get(key);
    if (value == null || value === "") {
      return defaultValue;
    }

    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }

    throw new Error(`Environment variable ${key} is not a valid boolean.`);
  }

  requireBoolean(key: string): boolean {
    const value = this.getBoolean(key);
    if (value == null) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  getAll(): Readonly<Record<string, string | undefined>> {
    return { ...process.env };
  }
}
