# Strudel Webapp

A simple Node.js server that serves a webpage with an embedded [Strudel](https://strudel.cc) live coding REPL in an iframe.

## Setup

```bash
npm install
```

## Run

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

## Project structure

- `server.js` – Express server that serves files from `public/`
- `public/index.html` – Main page with Strudel iframe
- `public/styles.css` – Page styles
- `public/script.js` – Page script (optional)

To embed a specific Strudel pattern, use a share URL from strudel.cc in the iframe `src` in `public/index.html` (e.g. `https://strudel.cc/?xwWRfuCE8TAR`).
