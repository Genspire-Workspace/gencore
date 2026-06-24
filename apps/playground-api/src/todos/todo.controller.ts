import { Controller, Delete, Get, Patch, Post, defineProblemDetailsType, json, problem } from "@genspire/server";
import type { RequestContext } from "@genspire/server";
import {
  CreateTodoRequest,
  DeleteTodoResponse,
  TodoListResponse,
  TodoResponse,
  UpdateTodoRequest,
} from "./todo.dto.js";
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
    responses: {
      400: {
        description: "Missing todo id",
        body: defineProblemDetailsType("Missing todo id problem response"),
      },
      404: {
        description: "Todo not found",
        body: defineProblemDetailsType("Todo not found problem response"),
      },
    },
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
    responses: {
      400: {
        description: "Validation error",
        body: defineProblemDetailsType("Validation error problem response"),
      },
      500: {
        description: "Internal server error",
        body: defineProblemDetailsType("Internal server error problem response"),
      },
    },
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
    responses: {
      400: {
        description: "Validation error",
        body: defineProblemDetailsType("Validation error problem response"),
      },
      404: {
        description: "Todo not found",
        body: defineProblemDetailsType("Todo not found problem response"),
      },
      500: {
        description: "Internal server error",
        body: defineProblemDetailsType("Internal server error problem response"),
      },
    },
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
    response: DeleteTodoResponse,
    responses: {
      400: {
        description: "Missing todo id",
        body: defineProblemDetailsType("Missing todo id problem response"),
      },
      404: {
        description: "Todo not found",
        body: defineProblemDetailsType("Todo not found problem response"),
      },
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
