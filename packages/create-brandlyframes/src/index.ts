#!/usr/bin/env node
import { Command } from 'commander';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const packageJson = JSON.parse(
  readFileSync(join(ROOT, 'package.json'), 'utf-8')
);

const TEMPLATES_DIR = join(ROOT, 'templates');

const TEMPLATES: Record<string, { description: string; dir: string }> = {
  blank: {
    description: 'Minimal empty BrandlyFrames project',
    dir: 'blank',
  },
  'hello-world': {
    description: 'Simple animated greeting with a single composition',
    dir: 'hello-world',
  },
  captions: {
    description: 'Composition with burned-in frame captions',
    dir: 'captions',
  },
  'product-promo': {
    description: 'Short product promo with scenes and transitions',
    dir: 'product-promo',
  },
  'frame-video-demo': {
    description: 'Frame-exact video demo (seek-accuracy, controlled playback)',
    dir: 'frame-video-demo',
  },
};

function log(msg: string) {
  console.log(msg);
}

function copyRecursive(src: string, dest: string) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function scaffold(template: string, projectDir: string, projectName: string) {
  const tpl = TEMPLATES[template];
  if (!tpl) {
    console.error(`Unknown template: ${template}`);
    console.error(`Available templates: ${Object.keys(TEMPLATES).join(', ')}`);
    process.exit(1);
  }

  if (existsSync(projectDir)) {
    console.error(`Directory already exists: ${projectDir}`);
    process.exit(1);
  }

  mkdirSync(projectDir, { recursive: true });

  const srcDir = join(TEMPLATES_DIR, tpl.dir);

  copyRecursive(srcDir, projectDir);

  // Rewrite package.json with project name
  const pkgPath = join(projectDir, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    pkg.name = projectName;
    pkg.description = `A BrandlyFrames project — ${tpl.description}`;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }

  log(`Created ${projectName} using the "${template}" template`);
  log(`  → ${projectDir}`);
  log('');
  log('Next steps:');
  log(`  cd ${projectDir}`);
  log('  pnpm install');
  log('  pnpm dev');
}

const program = new Command();

program
  .name(packageJson.name)
  .description(packageJson.description)
  .version(packageJson.version)
  .argument('[template]', 'template to scaffold (blank, hello-world, captions, product-promo, frame-video-demo)')
  .argument('[dir]', 'output directory (defaults to template name)')
  .option('-n, --name <name>', 'project name (defaults to directory name)')
  .option('-l, --list', 'list available templates')
  .action((template, dir, options) => {
    if (options.list) {
      log('Available templates:');
      for (const [key, value] of Object.entries(TEMPLATES)) {
        log(`  ${key.padEnd(18)} — ${value.description}`);
      }
      return;
    }

    const selected = template || 'blank';
    const projectName = options.name || dir || selected;
    const projectDir = resolve(dir || selected);

    scaffold(selected, projectDir, projectName);
  });

program.parse(process.argv);
