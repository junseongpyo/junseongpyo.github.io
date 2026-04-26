import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function yamlList(values) {
  if (!values.length) return "  - notes";

  return values.map((value) => `  - ${value}`).join("\n");
}

async function readPipedAnswers() {
  const chunks = [];
  for await (const chunk of input) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks)
    .toString("utf8")
    .split(/\r?\n/);
}

async function promptRequired(ask, label) {
  while (true) {
    const answer = (await ask(label)).trim();
    if (answer) return answer;
    output.write("Required.\n");
  }
}

async function runBuild() {
  output.write("Building site...\n");

  await new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", "build"], {
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Build failed with exit code ${code}.`));
    });
  });
}

const pipedAnswers = input.isTTY ? null : await readPipedAnswers();
let pipedIndex = 0;
const rl = input.isTTY ? createInterface({ input, output }) : null;

async function ask(label) {
  if (rl) return rl.question(label);

  output.write(label);
  return pipedAnswers[pipedIndex++] || "";
}

try {
  const title = await promptRequired(ask, "Title: ");
  const groupAnswer = (await ask("Group (default notes): ")).trim();
  const group = slugify(groupAnswer || "notes");
  const defaultSlug = slugify(title);
  const slugAnswer = (
    await ask(`Slug (${defaultSlug || "my-post"}): `)
  ).trim();
  const slug = slugify(slugAnswer || defaultSlug || "my-post");
  const description = (await ask("Description: ")).trim();
  const tagAnswer = (await ask("Tags (comma-separated, default notes): ")).trim();
  const tags = tagAnswer
    ? tagAnswer
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : ["notes"];

  const path = `posts/${slug}.md`;

  if (existsSync(path)) {
    throw new Error(`${path} already exists.`);
  }

  const post = `---
layout: layouts/post.njk
title: ${title}
description: ${description}
date: ${today()}
group: ${group}
tags:
${yamlList(tags)}
---

Write your post here.
`;

  await mkdir("posts", { recursive: true });
  await writeFile(path, post, "utf8");

  output.write(`Created ${path}\n`);
  await runBuild();
} finally {
  if (rl) rl.close();
}
