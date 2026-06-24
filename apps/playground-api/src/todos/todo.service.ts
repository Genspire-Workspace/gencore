// file: apps\playground-api\src\todos\todo.service.ts

import { GenError, Scoped } from "@genspire/core";
import { PlaygroundDbContext } from "../database/playground-db-context.js";
import { TodoEntity } from "./todo.entity.js";
import type { CreateTodoRequestDto, TodoListResponseDto, TodoResponseDto, UpdateTodoRequestDto } from "./todo.dto.js";

function toTodoResponse(todo: {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}): TodoResponseDto {
  return {
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}

@Scoped()
export class TodoService {
  static inject = [PlaygroundDbContext];

  constructor(private readonly db: PlaygroundDbContext) {}

  async list(): Promise<TodoListResponseDto> {
    const todos = await this.db.todos.list({
      orderBy: "createdAt",
      direction: "desc",
    });

    return {
      items: todos.map(toTodoResponse),
    };
  }

  async getById(id: string): Promise<TodoResponseDto | null> {
    const todo = await this.db.todos.findById(id);
    return todo ? toTodoResponse(todo) : null;
  }

  async create(input: CreateTodoRequestDto): Promise<TodoResponseDto> {
    const title = input.title?.trim();

    if (!title) {
      throw new GenError("Title is required.", "TODO_VALIDATION_ERROR");
    }

    const now = new Date();
    const todo = new TodoEntity();
    todo.id = crypto.randomUUID();
    todo.title = title;
    todo.completed = false;
    todo.createdAt = now;
    todo.updatedAt = now;

    await this.db.todos.add(todo);
    await this.db.saveChanges();

    return toTodoResponse(todo);
  }

  async updateById(id: string, input: UpdateTodoRequestDto): Promise<TodoResponseDto | null> {
    const title = input.title === undefined ? undefined : input.title.trim();

    if (input.title !== undefined && !title) {
      throw new GenError("Title cannot be empty.", "TODO_VALIDATION_ERROR");
    }

    const todo = await this.db.todos.findById(id);

    if (!todo) {
      return null;
    }

    if (title !== undefined) {
      todo.title = title;
    }

    if (input.completed !== undefined) {
      todo.completed = input.completed;
    }

    todo.updatedAt = new Date();

    await this.db.todos.update(todo);
    await this.db.saveChanges();

    return toTodoResponse(todo);
  }

  async deleteById(id: string): Promise<boolean> {
    const deleted = await this.db.todos.removeById(id);

    if (deleted) {
      await this.db.saveChanges();
    }

    return deleted;
  }
}
