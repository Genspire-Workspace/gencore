import type { GenApp } from "@genspire/core";
import { EntityManagerProvider } from "@genspire/data-mikroorm";
import { json, problem, type Server } from "@genspire/server";
import { PersonEntity } from "../entities/person.entity.js";

interface CreatePersonRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
}

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validateCreatePersonRequest(body: CreatePersonRequest): {
  firstName: string;
  lastName: string;
  email: string;
} | Response {
  const firstName = toTrimmedString(body.firstName);
  const lastName = toTrimmedString(body.lastName);
  const email = toTrimmedString(body.email).toLowerCase();

  if (!firstName || !lastName || !email) {
    return problem({
      status: 400,
      title: "Invalid person payload",
      detail: "firstName, lastName, and email are required.",
    });
  }

  return { firstName, lastName, email };
}

export function registerPersonRoutes(server: Server, app: GenApp): void {
  server.get("/health", () => ({ ok: true }));

  server.get("/person", async () => {
    const em = app.get(EntityManagerProvider).fork();
    return await em.find(PersonEntity, {});
  });

  server.get("/person/:id", async (ctx) => {
    const em = app.get(EntityManagerProvider).fork();
    const person = await em.findOne(PersonEntity, { id: ctx.params.id });

    if (!person) {
      return problem({ status: 404, title: "Person not found" });
    }

    return person;
  });

  server.post("/person", async (ctx) => {
    const em = app.get(EntityManagerProvider).fork();
    const body = await ctx.json<CreatePersonRequest>();
    const validated = validateCreatePersonRequest(body);

    if (validated instanceof Response) {
      return validated;
    }

    const now = new Date();
    const person = em.create(PersonEntity, {
      id: crypto.randomUUID(),
      firstName: validated.firstName,
      lastName: validated.lastName,
      email: validated.email,
      createdAt: now,
      updatedAt: now,
    });

    em.persist(person);
    await em.flush();
    return json(person, { status: 201 });
  });

  server.delete("/person/:id", async (ctx) => {
    const em = app.get(EntityManagerProvider).fork();
    const person = await em.findOne(PersonEntity, { id: ctx.params.id });

    if (!person) {
      return problem({ status: 404, title: "Person not found" });
    }

    em.remove(person);
    await em.flush();
    return { deleted: true };
  });
}
