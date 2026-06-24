import { Controller, Delete, Get, Patch, Post, json, problem } from "@genspire/server";
import type { RequestContext } from "@genspire/server";
import { CreateTodoRequest, TodoListResponse, TodoResponse, UpdateTodoRequest } from "./todo.dto.js";
import { TodoService } from "./todo.service.js";

@Controller("/todo", {
  tag: "Todo",
  description: "Todo management endpoints backed by libSQL",
})
export class TodoController {
  static inject = [TodoService];

  constructor(private readonly service: TodoService) {}

  @Get("/", {
    summary: "List todos",
    response: TodoListResponse,
  })
  async list() {
    return await this.service.list();
  }

  @Get("/:id", {
    summary: "Get todo by id",
    response: TodoResponse,
  })
  async getById(ctx: RequestContext) {
    const id = ctx.params.id;
    if (!id) {
      return problem({
        status: 400,
        title: "Todo id is required",
      });
    }

    const todo = await this.service.getById(id);

    if (!todo) {
      return problem({
        status: 404,
        title: "Todo not found",
      });
    }

    return todo;
  }

  @Post("/", {
    summary: "Create todo",
    request: CreateTodoRequest,
    response: TodoResponse,
  })
  async create(ctx: RequestContext) {
    return json(await this.service.create(await ctx.json<CreateTodoRequest>()), {
      status: 201,
    });
  }

  @Patch("/:id", {
    summary: "Update todo",
    request: UpdateTodoRequest,
    response: TodoResponse,
  })
  async updateById(ctx: RequestContext) {
    const id = ctx.params.id;
    if (!id) {
      return problem({
        status: 400,
        title: "Todo id is required",
      });
    }

    const todo = await this.service.updateById(
      id,
      await ctx.json<UpdateTodoRequest>(),
    );

    if (!todo) {
      return problem({
        status: 404,
        title: "Todo not found",
      });
    }

    return todo;
  }

  @Delete("/:id", {
    summary: "Delete todo",
    response: class DeleteTodoResponse {
      deleted!: boolean;
    },
  })
  async deleteById(ctx: RequestContext) {
    const id = ctx.params.id;
    if (!id) {
      return problem({
        status: 400,
        title: "Todo id is required",
      });
    }

    const deleted = await this.service.deleteById(id);

    if (!deleted) {
      return problem({
        status: 404,
        title: "Todo not found",
      });
    }

    return { deleted: true };
  }
}
