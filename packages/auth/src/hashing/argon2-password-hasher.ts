// file: packages\auth\src\hashing\argon2-password-hasher.ts

import { Singleton } from "@genspire/core";
import { argon2id } from "hash-wasm";
import { PasswordHasher } from "./password-hasher.js";

@Singleton()
export class Argon2PasswordHasher extends PasswordHasher {
  override async hash(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await argon2id({
      password,
      salt,
      parallelism: 1,
      iterations: 3,
      memorySize: 65536,
      hashLength: 32,
      outputType: "encoded",
    });
    return key;
  }

  override async verify(hash: string, password: string): Promise<boolean> {
    try {
      const parts = hash.split("$");
      if (parts.length < 5) {
        return false;
      }

      const params = parts[3];
      if (!params) {
        return false;
      }

      const mEntry = params.split(",").find((p) => p.startsWith("m="));
      const tEntry = params.split(",").find((p) => p.startsWith("t="));
      const pEntry = params.split(",").find((p) => p.startsWith("p="));
      if (!mEntry || !tEntry || !pEntry) {
        return false;
      }

      const saltB64 = parts[4];
      if (!saltB64) {
        return false;
      }

      const decodedSalt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
      const expected = await argon2id({
        password,
        salt: decodedSalt,
        parallelism: Number.parseInt(pEntry.replace("p=", ""), 10),
        iterations: Number.parseInt(tEntry.replace("t=", ""), 10),
        memorySize: Number.parseInt(mEntry.replace("m=", ""), 10),
        hashLength: 32,
        outputType: "encoded",
      });
      return expected === hash;
    } catch {
      return false;
    }
  }
}
