// file: packages\auth\src\hashing\password-hasher.ts

export class PasswordHasher {
  async hash(_password: string): Promise<string> {
    throw new Error(
      "PasswordHasher base class is not meant to be used directly. Subclass it or use Argon2PasswordHasher.",
    );
  }

  async verify(_hash: string, _password: string): Promise<boolean> {
    throw new Error(
      "PasswordHasher base class is not meant to be used directly. Subclass it or use Argon2PasswordHasher.",
    );
  }
}
