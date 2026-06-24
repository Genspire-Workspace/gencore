import { Singleton } from "@genspire/core";
import { GenError } from "@genspire/core";
import { TodoRepository } from "./todo.repository.js";
import type { CreateTodoRequest, TodoListResponse, TodoResponse, UpdateTodoRequest } from "./todo.dto.js";

function toTodoResponse(todo: {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}): TodoResponse {
  return {
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}

@Singleton()
export class TodoService {
  static inject = [TodoRepository];

  constructor(private readonly repository: TodoRepository) {}

  async list(): Promise<TodoListResponse> {
    const todos = await this.repository.list();
    return {
      items: todos.map(toTodoResponse),
    };
  }

  async getById(id: string): Promise<TodoResponse | null> {
    const todo = await this.repository.getById(id);
    return todo ? toTodoResponse(todo) : null;
  }

  async create(input: CreateTodoRequest): Promise<TodoResponse> {
    const title = input.title?.trim();

    if (!title) {
      throw new GenError("Title is required.", "TODO_VALIDATION_ERROR");
    }

    const now = new Date();
    const todo = await this.repository.create({
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: now,
      updatedAt: now,
    });

    return toTodoResponse(todo);
  }

  async updateById(id: string, input: UpdateTodoRequest): Promise<TodoResponse | null> {
    const title = input.title === undefined ? undefined : input.title.trim();

    if (input.title !== undefined && !title) {
      throw new GenError("Title cannot be empty.", "TODO_VALIDATION_ERROR");
    }

    const todo = await this.repository.updateById(id, {
      title,
      completed: input.completed,
    });

    return todo ? toTodoResponse(todo) : null;
  }

  async deleteById(id: string): Promise<boolean> {
    return await this.repository.deleteById(id);
  }
}
