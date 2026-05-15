# Goal Document Preview Integration

## Goal

interactive-os preview surfaces should be driven by one source document, not by copy spread across render code.

## Decision

`apps/composer-demo` now treats `previewDocument.source.ts` as the SSOT for the page header, API groups, section titles, section copy, flow rows, and test contract text.

`@interactive-os/document` reads that source document through `readPlaygroundSource`.

## Boundary

- `@interactive-os/document` reads source-shaped metadata.
- `composer-demo` renders the preview.
- `@interactive-os/anyeditable` still owns editing behavior, not page copy or preview metadata.
