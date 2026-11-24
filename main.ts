// cat-reviews-entry3 — main.ts
//
// A deterministic writer for a one-line, one-star review written by a
// house cat about its human. The program assembles the review from named
// segments, validates it against the competition gate (one line, 1-200
// characters, UTF-8, non-blank, deadpan one-star shape), and writes it to
// /output/entry.txt. No randomness, no clock, no environment input: the
// same run on any machine produces the same bytes every time.
//
// The review itself, in the cat's own deadpan voice:
//   "One star. My human locks the bathroom door every morning, then acts
//   betrayed when his favourite shoes smell like a formal protest.
//   I signed it with my paw."
//
// The joke works the way a real one-star review works: a specific,
// recognisable domestic grievance (the locked bathroom door, the shoes),
// measured by cat standards, with the sting saved for the last few
// words. The cat does not shout. The cat files paperwork.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// ---------------------------------------------------------------------------
// Fixed facts of the competition gate
// ---------------------------------------------------------------------------

const OUTPUT_PATH = "/output/entry.txt";
const MAX_REVIEW_CHARS = 200;
const MIN_REVIEW_CHARS = 1;
const STAR_OPENING = "One star.";
const PAW_SIGNATURE = "I signed it with my paw.";
const SPACE_JOINER = " ";
const LINE_BREAK = "\n";
const CARRIAGE_RETURN = "\r";

// ---------------------------------------------------------------------------
// The review, kept as named segments so each beat can be reasoned about
// ---------------------------------------------------------------------------

const REVIEW_SEGMENTS: ReadonlyArray<string> = [
  "One star.",
  "My human locks the bathroom door every morning,",
  "then acts betrayed when his favourite shoes smell like a formal protest.",
  "I signed it with my paw.",
];

// ---------------------------------------------------------------------------
// Small value types: every check returns a named result, never a bare null
// ---------------------------------------------------------------------------

interface SegmentInspection {
  segmentText: string;
  segmentChars: number;
  segmentWords: number;
  segmentBlank: boolean;
}

interface LengthInspection {
  measuredChars: number;
  measuredBytes: number;
  withinGate: boolean;
  lengthNote: string;
}

interface ShapeInspection {
  singleLine: boolean;
  nonBlank: boolean;
  opensWithStars: boolean;
  endsWithPaw: boolean;
  shapeNote: string;
}

interface ReviewVerdict {
  reviewLine: string;
  lengthInspection: LengthInspection;
  shapeInspection: ShapeInspection;
  segmentInspections: Array<SegmentInspection>;
  verdictOk: boolean;
  verdictFailures: Array<string>;
}

interface WriteReceipt {
  receiptPath: string;
  receiptBytes: number;
  receiptChars: number;
  receiptRoundTripOk: boolean;
}

// ---------------------------------------------------------------------------
// Counting helpers
// ---------------------------------------------------------------------------

function countCodePoints(textLine: string): number {
  const codePointList = [...textLine];
  const codePointCount = codePointList.length;
  return codePointCount;
}

function countWords(textLine: string): number {
  const trimmedLine = textLine.trim();
  const wordPieces = trimmedLine.split(/\s+/u);
  const nonEmptyPieces = wordPieces.filter((piece) => piece.length > 0);
  const wordCount = nonEmptyPieces.length;
  return wordCount;
}

function countUtf8Bytes(textLine: string): number {
  const encodedLine = new TextEncoder().encode(textLine);
  const byteCount = encodedLine.byteLength;
  return byteCount;
}

// ---------------------------------------------------------------------------
// Segment inspection: describe one beat of the review
// ---------------------------------------------------------------------------

function inspectSegment(segmentText: string): SegmentInspection {
  const segmentChars = countCodePoints(segmentText);
  const segmentWords = countWords(segmentText);
  const segmentBlank = segmentText.trim().length === 0;
  const segmentInspection: SegmentInspection = {
    segmentText,
    segmentChars,
    segmentWords,
    segmentBlank,
  };
  return segmentInspection;
}

function inspectSegments(
  segments: ReadonlyArray<string>,
): Array<SegmentInspection> {
  const inspectedSegments: Array<SegmentInspection> = [];
  for (const oneSegment of segments) {
    const oneInspection = inspectSegment(oneSegment);
    inspectedSegments.push(oneInspection);
  }
  return inspectedSegments;
}

// ---------------------------------------------------------------------------
// Assembly: join the named beats into the single review line
// ---------------------------------------------------------------------------

function assembleReviewLine(
  segments: ReadonlyArray<string>,
): string {
  const joinedLine = segments.join(SPACE_JOINER);
  const collapsedLine = joinedLine.replace(/\s+/gu, SPACE_JOINER);
  const trimmedLine = collapsedLine.trim();
  return trimmedLine;
}

// ---------------------------------------------------------------------------
// Gate checks: length, then shape
// ---------------------------------------------------------------------------

function inspectLength(reviewLine: string): LengthInspection {
  const measuredChars = countCodePoints(reviewLine);
  const measuredBytes = countUtf8Bytes(reviewLine);
  const aboveMinimum = measuredChars >= MIN_REVIEW_CHARS;
  const belowMaximum = measuredChars <= MAX_REVIEW_CHARS;
  const withinGate = aboveMinimum && belowMaximum;
  const lengthNoteParts: Array<string> = [];
  lengthNoteParts.push(`chars=${measuredChars}`);
  lengthNoteParts.push(`bytes=${measuredBytes}`);
  lengthNoteParts.push(`gate=${MIN_REVIEW_CHARS}-${MAX_REVIEW_CHARS}`);
  const lengthNote = lengthNoteParts.join(", ");
  const lengthInspection: LengthInspection = {
    measuredChars,
    measuredBytes,
    withinGate,
    lengthNote,
  };
  return lengthInspection;
}

function inspectShape(reviewLine: string): ShapeInspection {
  const hasLineBreak = reviewLine.includes(LINE_BREAK);
  const hasCarriageReturn = reviewLine.includes(CARRIAGE_RETURN);
  const singleLine = hasLineBreak === false && hasCarriageReturn === false;
  const nonBlank = reviewLine.trim().length > 0;
  const opensWithStars = reviewLine.startsWith(STAR_OPENING);
  const endsWithPaw = reviewLine.endsWith(PAW_SIGNATURE);
  const shapeNoteParts: Array<string> = [];
  shapeNoteParts.push(`singleLine=${singleLine}`);
  shapeNoteParts.push(`nonBlank=${nonBlank}`);
  shapeNoteParts.push(`opensWithStars=${opensWithStars}`);
  shapeNoteParts.push(`endsWithPaw=${endsWithPaw}`);
  const shapeNote = shapeNoteParts.join(", ");
  const shapeInspection: ShapeInspection = {
    singleLine,
    nonBlank,
    opensWithStars,
    endsWithPaw,
    shapeNote,
  };
  return shapeInspection;
}

function collectFailures(
  lengthInspection: LengthInspection,
  shapeInspection: ShapeInspection,
  segmentInspections: Array<SegmentInspection>,
): Array<string> {
  const failureList: Array<string> = [];
  const lengthOk = lengthInspection.withinGate;
  if (lengthOk === false) {
    const lengthFailure = `length outside gate: ${lengthInspection.lengthNote}`;
    failureList.push(lengthFailure);
  }
  if (shapeInspection.singleLine === false) {
    failureList.push("review must be exactly one line");
  }
  if (shapeInspection.nonBlank === false) {
    failureList.push("review must not be blank");
  }
  if (shapeInspection.opensWithStars === false) {
    failureList.push(`review must open with ${STAR_OPENING}`);
  }
  if (shapeInspection.endsWithPaw === false) {
    failureList.push("review must end with the paw signature");
  }
  for (const oneInspection of segmentInspections) {
    if (oneInspection.segmentBlank) {
      const blankFailure = `segment is blank: "${oneInspection.segmentText}"`;
      failureList.push(blankFailure);
    }
  }
  return failureList;
}

// ---------------------------------------------------------------------------
// Verdict: assemble, inspect, and either bless the line or refuse loudly
// ---------------------------------------------------------------------------

function buildVerdict(): ReviewVerdict {
  const reviewLine = assembleReviewLine(REVIEW_SEGMENTS);
  const segmentInspections = inspectSegments(REVIEW_SEGMENTS);
  const lengthInspection = inspectLength(reviewLine);
  const shapeInspection = inspectShape(reviewLine);
  const verdictFailures = collectFailures(
    lengthInspection,
    shapeInspection,
    segmentInspections,
  );
  const verdictOk = verdictFailures.length === 0;
  const reviewVerdict: ReviewVerdict = {
    reviewLine,
    lengthInspection,
    shapeInspection,
    segmentInspections,
    verdictOk,
    verdictFailures,
  };
  return reviewVerdict;
}

// ---------------------------------------------------------------------------
// Writing: create /output, write the line with a trailing newline, read back
// ---------------------------------------------------------------------------

function ensureOutputDirectory(outputPath: string): void {
  const parentDirectory = dirname(outputPath);
  try {
    mkdirSync(parentDirectory, { recursive: true });
  } catch (directoryErr) {
    const directoryMessage =
      directoryErr instanceof Error
        ? directoryErr.message
        : String(directoryErr);
    throw new Error(`cannot create output directory: ${directoryMessage}`);
  }
}

function writeReviewFile(
  reviewLine: string,
  outputPath: string,
): WriteReceipt {
  ensureOutputDirectory(outputPath);
  const fileText = `${reviewLine}${LINE_BREAK}`;
  try {
    writeFileSync(outputPath, fileText, { encoding: "utf8" });
  } catch (writeErr) {
    const writeMessage =
      writeErr instanceof Error ? writeErr.message : String(writeErr);
    throw new Error(`cannot write review file: ${writeMessage}`);
  }
  const receiptChars = countCodePoints(reviewLine);
  const receiptBytes = countUtf8Bytes(fileText);
  const roundTripText = readReviewFileBack(outputPath);
  const receiptRoundTripOk = roundTripText === fileText;
  const writeReceipt: WriteReceipt = {
    receiptPath: outputPath,
    receiptBytes,
    receiptChars,
    receiptRoundTripOk,
  };
  return writeReceipt;
}

function readReviewFileBack(outputPath: string): string {
  let roundTripText = "";
  try {
    roundTripText = readFileSync(outputPath, { encoding: "utf8" });
  } catch (readErr) {
    const readMessage =
      readErr instanceof Error ? readErr.message : String(readErr);
    throw new Error(`cannot read back review file: ${readMessage}`);
  }
  return roundTripText;
}

// ---------------------------------------------------------------------------
// Entry point: verdict first, write second, report third
// ---------------------------------------------------------------------------

function main(): void {
  const reviewVerdict = buildVerdict();
  const verdictOk = reviewVerdict.verdictOk;
  if (verdictOk === false) {
    const failureText = reviewVerdict.verdictFailures.join("; ");
    throw new Error(`review failed its gate: ${failureText}`);
  }
  const writeReceipt = writeReviewFile(reviewVerdict.reviewLine, OUTPUT_PATH);
  const roundTripOk = writeReceipt.receiptRoundTripOk;
  if (roundTripOk === false) {
    throw new Error("round-trip read of the review file mismatched");
  }
  const reportParts: Array<string> = [];
  reportParts.push(`wrote ${writeReceipt.receiptPath}`);
  reportParts.push(`chars=${writeReceipt.receiptChars}`);
  reportParts.push(`bytes=${writeReceipt.receiptBytes}`);
  reportParts.push(`line="${reviewVerdict.reviewLine}"`);
  const reportLine = reportParts.join(" | ");
  console.log(reportLine);
}

main();
