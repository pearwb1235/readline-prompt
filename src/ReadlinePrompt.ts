import { EventEmitter } from "events";
import * as readline from "readline";

export type ReadlinePromptOptions = {
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
};

export default class ReadlinePrompt extends EventEmitter {
  private input: NodeJS.ReadableStream;
  private output: NodeJS.WritableStream;
  private rl: readline.Interface | undefined;
  private originalWrite: typeof process.stdout.write | undefined;
  private originalWriteToOutput: ((str: string) => void) | undefined;
  private isRedrawing = false;
  private isReadlineWriting = false;

  constructor(options: ReadlinePromptOptions = {}) {
    super();
    this.input = options.input ?? process.stdin;
    this.output = options.output ?? process.stdout;
  }

  start() {
    if (this.rl) return;
    this.rl = readline.createInterface({
      input: this.input,
      output: this.output,
    });
    this.patchOutput();
    this.rl.on("line", this.onLine.bind(this));
    this.rl.prompt();
  }

  close() {
    this.unpatchOutput();
    this.rl?.close();
    this.rl = undefined;
  }

  private onLine(line: string) {
    this.isRedrawing = true;
    readline.moveCursor(this.output, 0, -1);
    readline.clearLine(this.output, 0);
    readline.cursorTo(this.output, 0);
    this.isRedrawing = false;
    this.emit("line", line);
    this.rl?.prompt();
  }

  private patchOutput() {
    if (!this.rl) return;
    const rl = this.rl as unknown as {
      _writeToOutput: (str: string) => void;
    };
    this.originalWriteToOutput = rl._writeToOutput.bind(rl);
    const originalWriteToOutput = this.originalWriteToOutput;
    rl._writeToOutput = (str: string) => {
      this.isReadlineWriting = true;
      originalWriteToOutput(str);
      this.isReadlineWriting = false;
    };

    const output = this.output;
    this.originalWrite = output.write.bind(
      output,
    ) as typeof process.stdout.write;
    const originalWrite = this.originalWrite;
    output.write = ((chunk: string | Uint8Array, ...args: unknown[]) => {
      if (
        this.isRedrawing ||
        this.isReadlineWriting ||
        !this.rl ||
        typeof chunk !== "string"
      ) {
        return (originalWrite as (...writeArgs: unknown[]) => boolean)(
          chunk,
          ...args,
        );
      }
      this.isRedrawing = true;
      readline.clearLine(output, 0);
      readline.cursorTo(output, 0);
      const result = (originalWrite as (...writeArgs: unknown[]) => boolean)(
        chunk,
        ...args,
      );
      this.rl.prompt(true);
      this.isRedrawing = false;
      return result;
    }) as typeof process.stdout.write;
  }

  private unpatchOutput() {
    if (this.originalWriteToOutput && this.rl) {
      (
        this.rl as unknown as { _writeToOutput: (str: string) => void }
      )._writeToOutput = this.originalWriteToOutput;
      this.originalWriteToOutput = undefined;
    }
    if (this.originalWrite) {
      this.output.write = this.originalWrite;
      this.originalWrite = undefined;
    }
  }
}
