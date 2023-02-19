import { jest } from "@jest/globals";

const mock = jest.fn();

type TestType = string;

describe("basic", () => {
  const test: TestType = "test";
  it("check if mocks are working", () => {
    mock.mockImplementation(() => "test");
    expect(mock()).toBe("test");
    expect(test).toBe("test");
  });
});
