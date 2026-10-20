import { describe, expect, it, jest } from "@jest/globals";
import { PassThrough } from "stream";
import ReadlinePrompt from "~/ReadlinePrompt";

const CLEAR_LINE = "\x1b[2K";

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

  it("clears the current prompt line when closed", () => {
    const { input, output } = createStreams();
    const prompt = new ReadlinePrompt({ input, output });
    const chunks: string[] = [];
    output.on("data", (chunk: Buffer) => chunks.push(chunk.toString()));

    prompt.start();
    chunks.length = 0; // 只關心 close() 本身寫了什麼

    prompt.close();

    expect(chunks.join("")).toContain(CLEAR_LINE);
  });

  it("clears the stale prompt when close() is called from an async line handler", async () => {
    const { input, output } = createStreams();
    const prompt = new ReadlinePrompt({ input, output });
    const chunks: string[] = [];
    output.on("data", (chunk: Buffer) => chunks.push(chunk.toString()));

    let releaseHandler: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseHandler = resolve;
    });
    prompt.on("line", async () => {
      await gate; // 卡住，等測試自己決定什麼時候讓 close() 執行
      prompt.close();
    });

    prompt.start();
    input.write("exit\n");

    // 此時 onLine 裡自動重新顯示提示字元那次呼叫已經跑完，
    // 監聽器還卡在 gate 上，close() 尚未執行。
    const clearCountBeforeClose = chunks.join("").split(CLEAR_LINE).length - 1;

    releaseHandler();
    await new Promise((resolve) => setImmediate(resolve));

    const clearCountAfterClose = chunks.join("").split(CLEAR_LINE).length - 1;
    expect(clearCountAfterClose).toBeGreaterThan(clearCountBeforeClose);
  });
});
