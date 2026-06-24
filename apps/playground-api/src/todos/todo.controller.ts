// file: apps\playground-api\src\todos\todo.controller.ts

import { Authorize, Controller, Delete, Get, Patch, Post, defineProblemDetailsType, json, problem } from "@genspire/server";
import type { RequestContext } from "@genspire/server";
import {
  CreateTodoRequestDto,
  DeleteTodoResponseDto,
  TodoListResponseDto,
  TodoResponseDto,
  UpdateTodoRequestDto,
} from "./todo.dto.js";
import { TodoService } from "./todo.service.js";

@Authorize()
@Controller("/todo", {
  tag: "Todo",
  description: "Todo management endpoints backed by libSQL",
})
export class TodoController {
  static inject = [TodoService];

  constructor(private readonly service: TodoService) {}

  @Get("/", {
    summary: "List todos",
    response: TodoListResponseDto,
  })
  async list() {
    return await this.service.list();
  }

  @Get("/:id", {
    summary: "Get todo by id",
    response: TodoResponseDto,
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
    request: CreateTodoRequestDto,
    response: TodoResponseDto,
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
    return json(await this.service.create(await ctx.json<CreateTodoRequestDto>()), {
      status: 201,
    });
  }

  @Patch("/:id", {
    summary: "Update todo",
    request: UpdateTodoRequestDto,
    response: TodoResponseDto,
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
      await ctx.json<UpdateTodoRequestDto>(),
    );

    if (!todo) {
      return problem({
        status: 404,
        title: "Todo not found",
      });
    }

    return todo;
  }

  @Authorize({ roles: ["admin"] })
  @Delete("/:id", {
    summary: "Delete todo",
    response: DeleteTodoResponseDto,
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
