# @brandlyframes/presets

## 1.1.0

### Minor Changes

- 8d66a6a: feat: add platform export presets [BF-426]

  Add `@brandlyframes/presets` package:
  - Six platform presets: web-safe, youtube, tiktok, instagram, whatsapp, broadcast
  - Each preset: pixel format, profile, level, bitrate/CRF, audio codec/bitrate, loudness, faststart, hwaccel
  - `getExportPreset()` lookup with validation
  - 11 unit tests covering all presets and edge cases
