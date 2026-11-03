# ONYX GRID

A lightweight Trackmania and esports broadcast control system built around OBS Studio, browser-source overlays, and TypeScript.

## Status

**9.2 Audio Manager Preview** — source upload and integration are in progress. This repository currently contains initial project documentation and Git configuration; it is **not yet a complete runnable source checkout**.

## Planned deployment

- **GitHub:** source code and release history
- **Vercel:** hosted browser-source overlays (after separating web-only code from local controls)
- **Local companion:** OBS WebSocket control, audio routing, and machine-specific configuration

## Security

Never commit OBS WebSocket passwords, guest session tokens, or machine-specific configuration. Publicly hosted overlays must not expose local OBS control endpoints.

## Development

The local preview package uses Node.js and TypeScript. The complete source tree and setup instructions will be added after the package is sanitized and imported.
