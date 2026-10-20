## 安裝

```sh
npm install @pearwb/readline-prompt
```

## 基本用法

```ts
import ReadlinePrompt from "@pearwb/readline-prompt";

const rl = new ReadlinePrompt();

rl.on("line", (line: string) => {
  console.log(`你輸入了：${line}`);
  // 不用自己呼叫 prompt()，送出一行後會自動顯示下一個提示字元
});

rl.start();
```

即使有背景輸出同時發生，正在輸入的內容也不會被打亂：

```ts
setInterval(() => {
  console.log(`現在時間：${new Date().toISOString()}`);
}, 5000);
```

## API

### `new ReadlinePrompt(options?)`

| 選項     | 型別                    | 預設             | 說明     |
| -------- | ----------------------- | ---------------- | -------- |
| `input`  | `NodeJS.ReadableStream` | `process.stdin`  | 輸入來源 |
| `output` | `NodeJS.WritableStream` | `process.stdout` | 輸出目標 |

### `rl.start()`

建立 `readline` 介面、套用輸出保護，並顯示第一個提示字元。已經啟動過的話，重複呼叫會被忽略。跟 `rl.close()` 是一組，標記整個 session 的開始與結束。

### `rl.close()`

還原被修改過的 `output.write` 與 `readline` 內部方法，並關閉 `readline` 介面。

### 事件：`"line"`

每次使用者按下 Enter 送出一行時觸發，參數是送出的字串（已經是去除換行符號、`readline` 處理過的結果）。這個套件不解析、不執行指令，`line` 的內容原封不動交給你自己處理。每次這個事件觸發完，會自動顯示下一個提示字元。

公開 API 就只有 `start()` 跟 `close()` 這組生命週期方法，加上 `"line"` 事件，沒有其他要手動呼叫的東西。

## 注意事項

這個套件會包一層 `readline` 內部、未公開的方法（`_writeToOutput`），藉此分辨「這次輸出是 `readline` 自己畫的」還是「外部背景輸出」。這個方法在 Node 各版本間一直存在且行為穩定，但它不是 Node 官方保證不變的公開 API。如果你在某個 Node 版本上遇到行為異常，歡迎回報 issue。

## 授權

BSD-3-Clause
