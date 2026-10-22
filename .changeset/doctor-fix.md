---
'@brandlyframes/cli': patch
---

feat: `doctor --fix` auto-fixes environment issues [BF-430]

- `ffmpeg` check is now fixable: installs via apt/brew/winget
- `chrome` check is now fixable: installs via apt/brew/winget
- `versions` check actually aligns all `@brandlyframes/*` package versions to the CLI version
- Reports fixed status and exits 0 when all issues resolved
