import { Singleton } from "@genspire/core";
import { EntityManagerProvider } from "@genspire/data-mikroorm";
import { TodoEntity } from "./todo.entity.js";

export interface CreateTodoRecord {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateTodoRecord {
  title?: string;
  completed?: boolean;
}

@Singleton()
export class TodoRepository {
  static inject = [EntityManagerProvider];

  constructor(private readonly entityManagerProvider: EntityManagerProvider) {}

  async list(): Promise<TodoEntity[]> {
    const em = this.entityManagerProvider.fork();
    return await em.find(TodoEntity, {}, { orderBy: { createdAt: "desc" } });
  }

  async getById(id: string): Promise<TodoEntity | null> {
    const em = this.entityManagerProvider.fork();
    return await em.findOne(TodoEntity, { id });
  }

  async create(input: CreateTodoRecord): Promise<TodoEntity> {
    const em = this.entityManagerProvider.fork();
    const todo = em.create(TodoEntity, input);
    em.persist(todo);
    await em.flush();
    return todo;
  }

  async updateById(id: string, input: UpdateTodoRecord): Promise<TodoEntity | null> {
    const em = this.entityManagerProvider.fork();
    const todo = await em.findOne(TodoEntity, { id });

    if (!todo) {
      return null;
    }

    if (input.title !== undefined) {
      todo.title = input.title;
    }

    if (input.completed !== undefined) {
      todo.completed = input.completed;
    }

    await em.flush();
    return todo;
  }

  async deleteById(id: string): Promise<boolean> {
    const em = this.entityManagerProvider.fork();
    const todo = await em.findOne(TodoEntity, { id });

    if (!todo) {
      return false;
    }

    em.remove(todo);
    await em.flush();
    return true;
  }
}
