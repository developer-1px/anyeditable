# Document Preview Result

## Goal

Keep the composer demo as a preview document generated from a single document source.

## Changed

- `previewDocument.source.ts` stores the page document.
- `previewDocument.ts` parses that source with `readPlaygroundSource`.
- `App.tsx` renders header, API groups, sections, flow rows, and test bullets from the parsed document.

## Result

The demo remains a browser smoke surface, but its explanatory document is now one SSOT.
