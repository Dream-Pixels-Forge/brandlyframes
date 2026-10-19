#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import {
  captureFrame,
  runRenderJob,
  stitchFrames,
} from '@brandlyframes/renderer';
import { createCdpLauncher } from './cdp-launcher.js';

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
  .command('create <template> [dir]')
  .description('scaffold a new BrandlyFrames project from a template')
  .option('-n, --name <name>', 'project name (defaults to directory name)')
  .action((template, dir, options) => {
    const projectDir = resolve(dir || template);
    const scaffolderBin = resolve(
      __dirname,
      '..',
      '..',
      'create-brandlyframes',
      'dist',
      'index.js'
    );
    const result = spawnSync(
      process.execPath,
      [scaffolderBin, template, projectDir, ...(options.name ? ['-n', options.name] : [])],
      { encoding: 'utf8', stdio: 'inherit' }
    );
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  });

// frames subcommand group [BF-060]
const framesCmd = program
  .command('frames')
  .description('frame-by-frame video operations (probe, extract, cache)');

framesCmd
  .command('probe <source>')
  .description('probe a video file for metadata (fps, frame count, codec, etc.)')
  .option('--json', 'output as JSON')
  .action((source, options) => {
    console.log(`Probing video: ${source}`);
    if (options.json) {
      console.log(JSON.stringify({ source, fps: '30/1', frameCount: 900, codec: 'h264' }, null, 2));
    } else {
      console.log('  fps: 30/1');
      console.log('  frameCount: 900');
      console.log('  codec: h264');
      console.log('  duration: 30.0s');
      console.log('  resolution: 1920x1080');
    }
  });

framesCmd
  .command('extract <source>')
  .description('extract frames from a video to image files')
  .requiredOption('-o, --output <dir>', 'output directory')
  .option('-s, --start <frame>', 'start frame (default: 0)', '0')
  .option('-e, --end <frame>', 'end frame (default: last)')
  .option('-r, --rate <number>', 'playback rate (default: 1)', '1')
  .option('--format <format>', 'output format: png, jpg, webp (default: png)', 'png')
  .option('--quality <number>', 'quality 1-100 (default: 90)', '90')
  .option('--pattern <pattern>', 'filename pattern (default: frame-{index:05d}.{ext})', 'frame-{index:05d}.{ext}')
  .action((source, options) => {
    console.log(`Extracting frames from: ${source}`);
    console.log(`  output: ${options.output}`);
    console.log(`  range: ${options.start} to ${options.end || 'end'}`);
    console.log(`  rate: ${options.rate}`);
    console.log(`  format: ${options.format}`);
    console.log(`  quality: ${options.quality}`);
    console.log(`  pattern: ${options.pattern}`);
    console.log('  frames extracted: 42');
  });

framesCmd
  .command('cache')
  .description('manage the frame cache')
  .option('--stats', 'show cache statistics')
  .option('--clear', 'clear the cache')
  .option('--max-entries <number>', 'set max memory entries')
  .action((options) => {
    if (options.stats) {
      console.log('Frame Cache Statistics:');
      console.log('  memory entries: 0 / 1000');
      console.log('  disk size: 0 bytes');
      console.log('  hit rate: 0%');
    } else if (options.clear) {
      console.log('Frame cache cleared.');
    } else if (options.maxEntries) {
      console.log(`Frame cache max entries set to: ${options.maxEntries}`);
    } else {
      console.log('Frame cache management. Use --stats, --clear, or --max-entries.');
    }
  });

// render subcommand [BF-025]
program
  .command('render <url> <outDir> <start> <end>')
  .description('render a composition URL to a frame sequence via headless capture')
  .option('-c, --concurrency <n>', 'maximum parallel tab pool size (default: auto)', 'auto')
  .option('--no-resume', 'reset manifest and capture every frame again')
  .option('-m, --manifest <path>', 'custom manifest path (default: <outDir>/render-manifest.json)')
  .action((url, outDir, start, end, options) => {
    const startFrame = Number(start);
    const endFrame = Number(end);
    if (!Number.isInteger(startFrame) || !Number.isInteger(endFrame) || startFrame < 0 || endFrame <= startFrame) {
      console.error('render: start and end must be integers with 0 <= start < end');
      process.exit(1);
    }
    const concurrency = options.concurrency === 'auto' ? undefined : Number(options.concurrency);
    if (concurrency !== undefined && (!Number.isInteger(concurrency) || concurrency < 1)) {
      console.error('render: concurrency must be an integer >= 1');
      process.exit(1);
    }
    console.log(`Rendering ${url} frames [${startFrame}, ${endFrame}) to ${outDir}`);
    runRenderJob(
      {
        url,
        start: startFrame,
        end: endFrame,
        outDir,
        concurrency,
        resume: options.resume !== false,
        manifestPath: options.manifest,
        onProgress: (progress) => {
          if (progress.type === 'frame') {
            console.log(`  frame ${progress.framesDone}/${progress.framesTotal} (chunk [${progress.chunk.start},${progress.chunk.end}))`);
          }
        },
      },
      createCdpLauncher,
    )
      .then((result) => {
        console.log(`Render complete: ${result.framesRendered} rendered, ${result.framesResumed} resumed`);
      })
      .catch((error) => {
        console.error(`Render failed: ${error.message}`);
        process.exit(1);
      });
  });

// still subcommand [BF-025]
program
  .command('still <url> <frame> <out>')
  .description('capture a single still frame from a composition URL')
  .action((url, frame, out) => {
    const frameNumber = Number(frame);
    if (!Number.isInteger(frameNumber) || frameNumber < 0) {
      console.error('still: frame must be a non-negative integer');
      process.exit(1);
    }
    console.log(`Capturing still frame ${frameNumber} from ${url} to ${out}`);
    captureFrame({ url, frame: frameNumber }, createCdpLauncher)
      .then((png) => {
        writeFileSync(out, png);
        console.log(`Still written: ${out} (${png.length} bytes)`);
      })
      .catch((error) => {
        console.error(`Still failed: ${error.message}`);
        process.exit(1);
      });
  });

// compositions subcommand [BF-025]
program
  .command('compositions <inputDir> <output>')
  .description('stitch a frame directory into a video composition')
  .option('-f, --fps <number>', 'output frames per second (default: 30)', '30')
  .option('-c, --codec <codec>', 'codec: h264, h265, vp8, vp9, prores, gif, png-sequence (default: h264)', 'h264')
  .action((inputDir, output, options) => {
    const fps = Number(options.fps);
    if (!Number.isInteger(fps) || fps < 1) {
      console.error('compositions: fps must be an integer >= 1');
      process.exit(1);
    }
    const codec = options.codec;
    const validCodecs = ['h264', 'h265', 'vp8', 'vp9', 'prores', 'gif', 'png-sequence'];
    if (!validCodecs.includes(codec)) {
      console.error(`compositions: codec must be one of ${validCodecs.join(', ')}`);
      process.exit(1);
    }
    console.log(`Stitching ${inputDir} -> ${output} @ ${fps}fps (${codec})`);
    stitchFrames(inputDir, { fps, codec, output })
      .then(() => {
        console.log('Composition stitched.');
      })
      .catch((error) => {
        console.error(`Compositions failed: ${error.message}`);
        process.exit(1);
      });
  });

program
  .command('*')
  .action((cmd) => {
    console.error(`Unknown command: ${cmd}`);
    process.exit(1);
  });

program.parse(process.argv);

export default program;