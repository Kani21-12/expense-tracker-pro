import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");

const filesToCopy = ["index.html", "script.js", "expenses.json"];
const dirsToCopy = ["assets"];

fs.mkdirSync(publicDir, { recursive: true });

function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

for (const filename of filesToCopy) {
  const src = path.join(root, filename);
  if (!fs.existsSync(src)) {
    continue;
  }
  const dest = path.join(publicDir, filename);
  fs.copyFileSync(src, dest);
}

for (const dirName of dirsToCopy) {
  const srcDir = path.join(root, dirName);
  const destDir = path.join(publicDir, dirName);
  copyDirRecursive(srcDir, destDir);
}

