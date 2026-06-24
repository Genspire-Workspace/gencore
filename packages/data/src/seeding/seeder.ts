// file: packages\data\src\seeding\seeder.ts

export interface Seeder {
  name: string;
  run(): Promise<void> | void;
}
