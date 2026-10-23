---
'@brandlyframes/cli': minor
---

feat: add `brandlyframes batch` subcommand [BF-141][BF-142]

- `brandlyframes batch <input> <outDir>` renders N variants from CSV/JSON/API input with `{{column}}` prop templating
- Writes a batch manifest (`batch-manifest.json`) recording every variant's props, rendered URL, output dir and status
- Crash-resume [BF-142]: a checkpoint file (`batch-checkpoint.json`) records completed variants; rerunning the same command skips them, so crashed batches resume with only the unfinished tail (`--no-resume` forces a fresh run)
