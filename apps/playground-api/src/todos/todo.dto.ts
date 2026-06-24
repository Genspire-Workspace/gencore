import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({
  description: "Request payload for creating a todo",
})
export class CreateTodoRequest {
  @ApiField({
    type: "string",
    description: "Todo title",
  })
  title!: string;
}

@ApiDto({
  description: "Request payload for updating a todo",
})
export class UpdateTodoRequest {
  @ApiField({
    type: "string",
    description: "Updated todo title",
    required: false,
  })
  title?: string;

  @ApiField({
    type: "boolean",
    description: "Updated completion state",
    required: false,
  })
  completed?: boolean;
}

@ApiDto({
  description: "A persisted todo record",
})
export class TodoResponse {
  @ApiField({ type: "string" })
  id!: string;

  @ApiField({ type: "string" })
  title!: string;

  @ApiField({ type: "boolean" })
  completed!: boolean;

  @ApiField({ type: "string", format: "date-time" })
  createdAt!: string;

  @ApiField({ type: "string", format: "date-time" })
  updatedAt!: string;
}

@ApiDto({
  description: "A list of todo records",
})
export class TodoListResponse {
  @ApiField({
    arrayOf: TodoResponse,
    description: "Todo items",
  })
  items!: TodoResponse[];
}

@ApiDto({
  description: "Delete todo response",
})
export class DeleteTodoResponse {
  @ApiField({
    type: "boolean",
    description: "Whether the todo was deleted.",
  })
  deleted!: boolean;
}
