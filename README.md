# Time Zone Converter

> By [Star](https://x.com/starzq) | [GitHub](https://github.com/star23/time-converter)

A Chrome extension that automatically detects time mentions on web pages (e.g. X/Twitter) and converts them to your local timezone with proper DST handling.

一个 Chrome 扩展，自动识别网页上的时间文本（如 X/Twitter），转换为你本地时区的时间，正确处理夏令时。

## Features

- Detects time formats like `9PM ET`, `3:00 PM PST`, `15:00 GMT`, `9PM London time`
- Inline badge shows converted time right next to the original text
- Proper DST handling via the IANA timezone database
- Infers event date from post timestamp + relative date words (e.g. "Tomorrow night at 9PM ET")
- Works on dynamically loaded content (SPA support for X/Twitter, etc.)
- Shows date only when the event is not today

## How It Works / 实现原理

### 1. Time Detection / 时间识别

Uses regex to match 12-hour (`9PM ET`, `3:00 PM PST`) and 24-hour (`15:00 GMT`) formats with timezone abbreviations, full names (`Eastern Time`), or city names (`Tokyo time`).

使用正则表达式匹配 12 小时制和 24 小时制的时间文本，支持时区缩写、全称和城市名。

### 2. Timezone Mapping / 时区映射

Maps abbreviations (ET, EST, EDT, PST...) and city names (Tokyo, London...) to IANA timezone identifiers (e.g. `America/New_York`). Ambiguous abbreviations like "EST" are treated as the general zone, not specifically standard time.

将时区缩写和城市名映射到 IANA 时区标识符。模糊的缩写（如 "EST"）被视为通用时区名，由实际日期决定是否处于夏令时。

### 3. DST Handling / 夏令时处理

Leverages the browser's built-in `Intl` API, which uses the IANA timezone database internally. The API automatically resolves the correct UTC offset for any given date, so DST transitions are handled correctly without shipping a separate timezone database.

利用浏览器内置的 `Intl` API（底层使用 IANA 时区数据库），根据具体日期自动判断是否处于夏令时，无需额外的时区数据库。

### 4. Date Inference / 日期推断

Extracts the post's `<time datetime>` from the DOM (e.g. on X/Twitter), parses relative date words ("tomorrow", "tonight", "next Monday"), and resolves the event date in the **source timezone** — not the reader's local timezone. This avoids off-by-one-day errors when timezones cross midnight.

从 DOM 中提取帖子的 `<time datetime>` 时间戳，解析相对日期词（"tomorrow"、"tonight" 等），在**源时区**（而非读者的本地时区）计算事件日期，避免跨日误差。

**Example / 示例:**

A tweet posted at 7:48 PM EDT on March 31 says "Tomorrow night at 9PM ET":
1. `<time datetime>` → UTC March 31 23:48
2. Convert to source timezone (ET/EDT) → **March 31**
3. "Tomorrow" → March 31 + 1 = **April 1** (in ET)
4. 9PM ET on April 1 → UTC April 2 01:00
5. Convert to GMT+8 → **April 2 9:00 AM**
6. Badge: `9:00 AM GMT+8 Thu, Apr 2`

### 5. Same Timezone Skip / 同时区跳过

If the user's local timezone has the same UTC offset as the source timezone, no badge is shown — because no conversion is needed.

如果用户的本地时区与源时区的 UTC 偏移相同，则不显示 badge，因为不需要转换。

## Installation / 安装

1. Clone or download this repository / 克隆或下载本仓库
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** / 启用**开发者模式**
4. Click **Load unpacked** and select the `time-converter` directory / 点击**加载已解压的扩展程序**，选择 `time-converter` 目录

## License

MIT
