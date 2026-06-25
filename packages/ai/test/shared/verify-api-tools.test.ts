import { describe, expect, test } from "bun:test";
import { executeSmokeClientToolCalls } from "./verify-api-tools.js";
import { addNumbersTool } from "../tools/test-tools.js";

describe("verify-api-tools", () => {
  test("throws clearly when a requested client tool is not locally implemented", async () => {
    await expect(
      executeSmokeClientToolCalls(
        [
          {
            id: "call-1",
            name: "missing_client_tool",
            arguments: {},
          },
        ],
        [addNumbersTool],
      ),
    ).rejects.toThrow(
      "No local client tool implementation is registered for 'missing_client_tool'.",
    );
  });
});
