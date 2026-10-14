#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

const program = new Command();

program
  .name(packageJson.name)
  .description(packageJson.description)
  .version(packageJson.version)
  .option('-d, --debug', 'enable debug mode')
  .arguments('<command>')
  .action((cmd) => {
    if (!cmd) {
      program.help();
    }
    console.error(`Unknown command: ${cmd}`);
    process.exit(1);
  });

// Parse command line arguments
program.parse(process.argv);

export default program;