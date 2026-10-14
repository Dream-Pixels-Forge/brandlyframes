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
  .option('-d, --debug', 'enable debug mode');

program
  .command('dev')
  .description('start development server with hot-reloading (Studio)')
  .action(() => {
    console.log('Starting development server...');
  });

program
  .command('build')
  .description('render a composition to video/image sequence')
  .action(() => {
    console.log('Building composition...');
  });

  program
    .command('export')
    .description('export to platform-specific formats')
    .action(() => {
      console.log('Exporting to platform-specific formats...');
    });

  program
    .command('upgrade')
    .description('handle SDK upgrades with codemods')
    .action(() => {
      console.log('Checking for upgrades...');
    });

  program
    .command('*')
    .action((cmd) => {
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
    });

  program.parse(process.argv);

export default program;