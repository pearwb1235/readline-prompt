import { describe, expect, it, jest } from "@jest/globals";
import { PassThrough } from "stream";
import ReadlinePrompt from "~/ReadlinePrompt";

function createStreams() {
  const input = new PassThrough();
  const output = new PassThrough();
  return { input, output };
}

describe("ReadlinePrompt", () => {
  it("emits line with the submitted text", () => {
    const { input, output } = createStreams();
    const prompt = new ReadlinePrompt({ input, output });
    const onLine = jest.fn();
    prompt.on("line", onLine);

    prompt.start();
    input.write("hello\n");

    expect(onLine).toHaveBeenCalledWith("hello");
    prompt.close();
  });

  it("emits each submitted line separately", () => {
    const { input, output } = createStreams();
    const prompt = new ReadlinePrompt({ input, output });
    const lines: string[] = [];
    prompt.on("line", (line: string) => lines.push(line));

    prompt.start();
    input.write("foo\n");
    input.write("bar\n");

    expect(lines).toEqual(["foo", "bar"]);
    prompt.close();
  });

  it("restores the output stream's write after close", () => {
    const { input, output } = createStreams();
    const originalWrite = output.write;
    const prompt = new ReadlinePrompt({ input, output });

    prompt.start();
    const patchedWrite = output.write;
    expect(patchedWrite).not.toBe(originalWrite);

    prompt.close();
    expect(output.write).not.toBe(patchedWrite);
  });

  it("does not throw when background output is written mid-session", () => {
    const { input, output } = createStreams();
    const prompt = new ReadlinePrompt({ input, output });
    const chunks: string[] = [];
    output.on("data", (chunk: Buffer) => chunks.push(chunk.toString()));

    prompt.start();
    output.write("background log\n");
    input.write("hello\n");

    expect(chunks.join("")).toContain("background log");
    prompt.close();
  });
});
