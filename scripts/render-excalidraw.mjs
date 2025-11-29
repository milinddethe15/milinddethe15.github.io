import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.join(__dirname, "..");
const notesRoot = path.join(repoRoot, "notes-hub");
const outputRoot = path.join(repoRoot, "static", "excalidraw");

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.DOMRect = dom.window.DOMRect;
globalThis.DOMPoint = dom.window.DOMPoint;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.Element = dom.window.Element;
globalThis.window.devicePixelRatio = 1;

const excalidrawModulePath = path.join(repoRoot, "node_modules", "@excalidraw", "excalidraw", "dist/prod/index.js");
let exportToSvgFn = null;

async function ensureLibraryLoaded() {
  if (exportToSvgFn) {
    return;
  }
  const module = await import(pathToFileURL(excalidrawModulePath));
  exportToSvgFn = module.exportToSvg || (module.default && module.default.exportToSvg);
  if (!exportToSvgFn) {
    throw new Error("Could not load exportToSvg from @excalidraw/excalidraw.");
  }
}

const SUPPORTED_EXTENSIONS = [/\.excalidraw$/i, /\.excalidraw\.json$/i];

function hasSupportedExtension(name) {
  return SUPPORTED_EXTENSIONS.some((regex) => regex.test(name));
}

function walkForFiles(startDir) {
  const stack = [startDir];
  const files = [];

  while (stack.length) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (hasSupportedExtension(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

async function renderFile(absPath) {
  await ensureLibraryLoaded();
  const relPath = path.relative(notesRoot, absPath);
  const outRelative = relPath.replace(/\.excalidraw(\.json)?$/i, ".svg");
  const outPath = path.join(outputRoot, outRelative);

  const raw = fs.readFileSync(absPath, "utf8");
  const data = JSON.parse(raw);

  const svg = await exportToSvgFn({
    elements: data.elements || [],
    appState: {
      exportBackground: true,
      backgroundColor: "#ffffff",
      ...(data.appState || {}),
    },
    files: data.files || {},
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, svg.outerHTML);
  return outRelative;
}

function pruneOutputs(validRelatives) {
  if (!fs.existsSync(outputRoot)) {
    return;
  }

  const stack = [outputRoot];
  while (stack.length) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      const rel = path.relative(outputRoot, fullPath);
      if (!validRelatives.has(rel)) {
        fs.rmSync(fullPath);
        console.log(`Removed stale drawing ${path.join("static/excalidraw", rel)}`);
      }
    }

    if (dir !== outputRoot && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
    }
  }
}

async function main() {
  if (!fs.existsSync(notesRoot)) {
    console.error("notes-hub submodule not found. Run `git submodule update --init --recursive` first.");
    process.exit(1);
  }

  const files = walkForFiles(notesRoot);
  if (files.length === 0) {
    console.log("No Excalidraw files found. Skipping rendering.");
    return;
  }

  const rendered = new Set();
  for (const filePath of files) {
    try {
      const rel = await renderFile(filePath);
      rendered.add(rel);
      console.log(`Rendered ${path.join("static/excalidraw", rel)}`);
    } catch (error) {
      console.error(`Failed to render ${filePath}: ${error.message}`);
    }
  }

  pruneOutputs(rendered);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

