const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const notesRoot = path.join(repoRoot, "notes-hub");
const contentRoot = path.join(repoRoot, "content", "notes");

if (!fs.existsSync(notesRoot)) {
  console.error(
    "notes-hub submodule not found. Run `git submodule update --init --recursive` first."
  );
  process.exit(1);
}

if (!fs.existsSync(contentRoot)) {
  console.error("content/notes directory is missing.");
  process.exit(1);
}

const slugify = (value) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || value.trim().toLowerCase().replace(/\s+/g, "-");
};

const humanize = (value) =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const escapeQuotes = (value) => value.replace(/"/g, '\\"');

const entries = fs.readdirSync(notesRoot, { withFileTypes: true });
const generatedSlugs = new Set();

for (const entry of entries) {
  if (!entry.isDirectory() || entry.name.startsWith(".")) {
    continue;
  }

  const slug = slugify(entry.name);

  if (generatedSlugs.has(slug)) {
    console.warn(
      `Duplicate slug "${slug}" detected. Skipping directory ${entry.name}.`
    );
    continue;
  }

  generatedSlugs.add(slug);

  const targetDir = path.join(contentRoot, slug);
  const targetFile = path.join(targetDir, "index.md");
  const legacyFile = path.join(targetDir, "_index.md");
  fs.mkdirSync(targetDir, { recursive: true });

  if (fs.existsSync(legacyFile)) {
    fs.rmSync(legacyFile);
  }

  const title = humanize(entry.name);
  const relativeTarget = path.relative(repoRoot, targetFile);
  const content = [
    "+++",
    `title = "${escapeQuotes(title)}"`,
    `notes_dir = "${entry.name}"`,
    `generated_by = "sync-notes-pages"`,
    "+++",
    "",
    `Notes synced from the \`${entry.name}\` directory.`,
    "",
  ].join("\n");

  if (
    !fs.existsSync(targetFile) ||
    fs.readFileSync(targetFile, "utf8") !== content
  ) {
    fs.writeFileSync(targetFile, content);
    console.log(`Updated ${relativeTarget}`);
  }
}

const contentEntries = fs.readdirSync(contentRoot, { withFileTypes: true });

for (const entry of contentEntries) {
  if (!entry.isDirectory()) {
    continue;
  }

  if (generatedSlugs.has(entry.name)) {
    continue;
  }

  const pageRoot = path.join(contentRoot, entry.name);
  const candidates = ["index.md", "_index.md"];
  const target = candidates
    .map((name) => path.join(pageRoot, name))
    .find((file) => fs.existsSync(file));

  if (!target) {
    continue;
  }

  const raw = fs.readFileSync(target, "utf8");
  if (raw.includes('generated_by = "sync-notes-pages"')) {
    fs.rmSync(pageRoot, { recursive: true, force: true });
    console.log(`Removed stale page content/notes/${entry.name}`);
  }
}

