# 📰 Google News CLI (`gnews`)

A fast, interactive, and beautifully formatted Command Line Interface (CLI) application built with Node.js to fetch, search, filter, and read the latest news from Google News directly in your terminal.

---

## ✨ Features

- 📰 **Top News Headlines**: Instant access to the latest breaking news.
- 🏷️ **Topic Filtering**: Browse by categories (`WORLD`, `NATION`, `BUSINESS`, `TECHNOLOGY`, `ENTERTAINMENT`, `SPORTS`, `SCIENCE`, `HEALTH`).
- 🔍 **Keyword Search**: Search articles for specific terms or topics.
- 🔢 **Custom Limits**: Fetch anywhere from 1 to 30 headlines at a time.
- 🌐 **Interactive Browser Integration**: Select an article using arrow keys and open it directly in your browser.
- 🎨 **Rich Formatting**: Styled with relative timestamps, source badges, and colorized layouts.

---

## 🚀 Installation & Setup

1. Clone or navigate to the project directory:
   ```bash
   cd my-first-project
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Link the CLI globally so you can run `gnews` from anywhere:
   ```bash
   npm link
   ```

---

## 💻 Usage & Examples

### 1. View Top Stories (Default)
```bash
node src/index.js
# Or if linked globally:
gnews
```

### 2. Filter by Category / Topic
```bash
node src/index.js --topic TECHNOLOGY
node src/index.js -t BUSINESS -l 5
```

Available topics: `TOP`, `WORLD`, `NATION`, `BUSINESS`, `TECHNOLOGY`, `ENTERTAINMENT`, `SPORTS`, `SCIENCE`, `HEALTH`.

### 3. Search for Specific Keywords
```bash
node src/index.js --search "Artificial Intelligence"
node src/index.js -s "space exploration" -l 8
```

### 4. Direct Browser Action
Open article #2 in your default browser immediately:
```bash
node src/index.js --topic SCIENCE --open 2
```

### 5. Interactive Mode
Run in interactive terminal mode to navigate through articles, change categories, or search dynamically:
```bash
node src/index.js --interactive
```

---

## 🛠️ Architecture

- **`src/index.js`**: CLI argument parsing (`commander`), interactive prompts (`@inquirer/prompts`), and application flow control.
- **`src/newsService.js`**: Fetches Google News RSS feeds via `rss-parser`, supporting dynamic category and search query endpoints.
- **`src/uiFormatter.js`**: Terminal UI rendering with `chalk`, relative time calculation, and formatted source badges.
