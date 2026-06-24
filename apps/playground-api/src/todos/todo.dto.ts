// file: apps\playground-api\src\todos\todo.dto.ts

import { ApiDto, ApiField } from "@genspire/server";

@ApiDto({
  description: "Request payload for creating a todo",
})
export class CreateTodoRequestDto {
  @ApiField({
    type: "string",
    description: "Todo title",
  })
  title!: string;
}

@ApiDto({
  description: "Request payload for updating a todo",
})
export class UpdateTodoRequestDto {
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
export class TodoResponseDto {
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
export class TodoListResponseDto {
  @ApiField({
    arrayOf: TodoResponseDto,
    description: "Todo items",
  })
  items!: TodoResponseDto[];
}

@ApiDto({
  description: "Delete todo response",
})
export class DeleteTodoResponseDto {
  @ApiField({
    type: "boolean",
    description: "Whether the todo was deleted.",
  })
  deleted!: boolean;
}
