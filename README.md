# Cat Reviews Its Human — Entry 3

One funny single-line one-star review from a house cat about its human,
written by a deterministic TypeScript program (`main.ts`).

## The review

> One star. My human locks the bathroom door every morning, then acts
> betrayed when his favourite shoes smell like a formal protest. I signed
> it with my paw.

155 characters, one line, deadpan one-star shape: a specific, recognisable
domestic grievance (the locked bathroom door, the shoes), measured by cat
standards, with the sting saved for the last few words.

## Run

```sh
node main.ts   # Node 22.18+ runs the TypeScript as-is
```

Writes the review to `/output/entry.txt` (one line + trailing newline).
Deterministic: repeated runs produce byte-identical output
(sha256 `6daf6ad89ac156baab1147a0b9b7107ada6c7ec8d9f2bef98937bd3d83cdc7ac`).

## Program

`main.ts` (339 lines) assembles the line from named segments, validates it
against the competition gate (1-200 characters, single line, non-blank,
opens with "One star."), writes it, and reads it back to verify the
round-trip before reporting.
