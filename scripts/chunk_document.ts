#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { convert } from 'html-to-text';

interface ChunkInfo {
  name: string;
  path: string;
  pages?: string;
  pageCount?: number;
  sections?: string;
  sectionCount?: number;
}

interface Manifest {
  originalFile: string;
  inputType: 'pdf' | 'epub';
  totalPages?: number;
  pagesPerChunk?: number;
  totalSections?: number;
  sectionsPerChunk?: number;
  totalChunks: number;
  chunks: Array<Omit<ChunkInfo, 'path'>>;
}

interface EpubSection {
  sourcePath: string;
  text: string;
}

export function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function normalizeText(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function resolveInputMeta(inputPath: string): { ext: string; name: string } {
  const extWithCase = path.extname(inputPath);
  return {
    ext: extWithCase.toLowerCase(),
    name: path.basename(inputPath, extWithCase)
  };
}

function ensureInputExists(inputPath: string): void {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`File not found: ${inputPath}`);
  }
  if (!fs.statSync(inputPath).isFile()) {
    throw new Error(`Path is not a file: ${inputPath}`);
  }
}

function ensureOutputDir(outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

function writeManifest(outputDir: string, manifest: Manifest): string {
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return manifestPath;
}

function checkFileSize(inputPath: string): number {
  const stats = fs.statSync(inputPath);
  const fileSizeMB = stats.size / (1024 * 1024);
  if (fileSizeMB > 100) {
    console.warn(
      `WARNING: File is ${fileSizeMB.toFixed(0)} MB. ` +
      `Memory usage may be high during chunking.`
    );
  }
  return fileSizeMB;
}

async function splitPdf(inputPath: string, pagesPerChunk = 5, outputDir: string | null = null): Promise<Manifest> {
  ensureInputExists(inputPath);
  checkFileSize(inputPath);

  const { name: inputName } = resolveInputMeta(inputPath);
  outputDir = outputDir || path.join(path.dirname(inputPath), `${inputName}_chunks`);
  ensureOutputDir(outputDir);

  console.log(`Loading PDF: ${inputPath}`);
  const pdfBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const totalPages = pdfDoc.getPageCount();

  console.log(`Total pages: ${totalPages}`);
  console.log(`Pages per chunk: ${pagesPerChunk}`);

  const totalChunks = Math.ceil(totalPages / pagesPerChunk);
  console.log(`Creating ${totalChunks} chunk(s)...\n`);

  const chunkFiles: ChunkInfo[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const startPage = i * pagesPerChunk;
    const endPage = Math.min(startPage + pagesPerChunk, totalPages);

    const chunkPdf = await PDFDocument.create();

    const pageIndices: number[] = [];
    for (let j = startPage; j < endPage; j++) {
      pageIndices.push(j);
    }

    const copiedPages = await chunkPdf.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach(page => chunkPdf.addPage(page));

    const chunkName = `chunk_${String(i + 1).padStart(3, '0')}.pdf`;
    const chunkPath = path.join(outputDir, chunkName);

    const chunkBytes = await chunkPdf.save();
    fs.writeFileSync(chunkPath, chunkBytes);

    chunkFiles.push({
      name: chunkName,
      path: chunkPath,
      pages: `${startPage + 1}-${endPage}`,
      pageCount: endPage - startPage
    });

    console.log(`Created: ${chunkName} (pages ${startPage + 1}-${endPage})`);
  }

  const manifest: Manifest = {
    originalFile: path.basename(inputPath),
    inputType: 'pdf',
    totalPages,
    pagesPerChunk,
    totalChunks,
    chunks: chunkFiles.map(c => ({ name: c.name, pages: c.pages, pageCount: c.pageCount }))
  };

  const manifestPath = writeManifest(outputDir, manifest);

  console.log(`\nDone! Created ${totalChunks} chunks in: ${outputDir}`);
  console.log(`Manifest saved to: ${manifestPath}`);

  return manifest;
}

async function readZipTextFile(zip: JSZip, filePath: string): Promise<string | null> {
  const exact = zip.file(filePath);
  if (exact) return exact.async('text');

  const decodedPath = filePath.includes('%') ? decodeURIComponent(filePath) : filePath;
  const decoded = zip.file(decodedPath);
  if (decoded) return decoded.async('text');

  return null;
}

async function extractEpubSections(inputPath: string): Promise<EpubSection[]> {
  const epubBytes = fs.readFileSync(inputPath);
  const zip = await JSZip.loadAsync(epubBytes);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    removeNSPrefix: true,
    trimValues: true
  });

  const containerXml = await readZipTextFile(zip, 'META-INF/container.xml');
  if (!containerXml) {
    throw new Error('Invalid EPUB: META-INF/container.xml not found');
  }

  const containerDoc = parser.parse(containerXml);
  const rootfileNodes = toArray(containerDoc?.container?.rootfiles?.rootfile);
  const rootfilePath = rootfileNodes[0]?.['full-path'];

  if (!rootfilePath) {
    throw new Error('Invalid EPUB: package rootfile path missing');
  }

  const opfXml = await readZipTextFile(zip, rootfilePath);
  if (!opfXml) {
    throw new Error(`Invalid EPUB: package file not found: ${rootfilePath}`);
  }

  const opfDoc = parser.parse(opfXml);
  const packageDoc = opfDoc?.package;
  const manifestItems = toArray(packageDoc?.manifest?.item);
  const spineItems = toArray(packageDoc?.spine?.itemref);

  const manifestById = new Map<string, { href: string; 'media-type'?: string }>();
  for (const item of manifestItems) {
    if (item?.id && item?.href) {
      manifestById.set(item.id, item);
    }
  }

  const opfDirRaw = path.posix.dirname(rootfilePath);
  const opfDir = opfDirRaw === '.' ? '' : opfDirRaw;

  const sections: EpubSection[] = [];
  for (const itemRef of spineItems) {
    const idRef = itemRef?.idref;
    if (!idRef) continue;

    const manifestItem = manifestById.get(idRef);
    if (!manifestItem?.href) continue;

    const sectionPath = path.posix.normalize(
      opfDir ? path.posix.join(opfDir, manifestItem.href) : manifestItem.href
    );
    const mediaType = String(manifestItem['media-type'] || '').toLowerCase();
    const isMarkup =
      mediaType.includes('html') || /\.(xhtml|html|htm)$/i.test(sectionPath);

    if (!isMarkup) continue;

    const sectionHtml = await readZipTextFile(zip, sectionPath);
    if (!sectionHtml) continue;

    const text = normalizeText(
      convert(sectionHtml, {
        wordwrap: false,
        preserveNewlines: true,
        selectors: [
          { selector: 'img', format: 'skip' },
          { selector: 'svg', format: 'skip' }
        ]
      })
    );

    if (text) {
      sections.push({ sourcePath: sectionPath, text });
    }
  }

  if (sections.length === 0) {
    throw new Error('No readable spine text sections found in EPUB');
  }

  return sections;
}

async function splitEpub(inputPath: string, sectionsPerChunk = 5, outputDir: string | null = null): Promise<Manifest> {
  ensureInputExists(inputPath);
  checkFileSize(inputPath);

  const { name: inputName } = resolveInputMeta(inputPath);
  outputDir = outputDir || path.join(path.dirname(inputPath), `${inputName}_chunks`);
  ensureOutputDir(outputDir);

  console.log(`Loading EPUB: ${inputPath}`);
  const sections = await extractEpubSections(inputPath);
  const totalSections = sections.length;
  const totalChunks = Math.ceil(totalSections / sectionsPerChunk);

  console.log(`Total sections: ${totalSections}`);
  console.log(`Sections per chunk: ${sectionsPerChunk}`);
  console.log(`Creating ${totalChunks} chunk(s)...\n`);

  const chunkFiles: ChunkInfo[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const startSection = i * sectionsPerChunk;
    const endSection = Math.min(startSection + sectionsPerChunk, totalSections);
    const sectionSlice = sections.slice(startSection, endSection);

    const chunkBody = sectionSlice
      .map((section, index) => {
        const sectionNumber = startSection + index + 1;
        return `[Section ${sectionNumber}: ${section.sourcePath}]\n\n${section.text}`;
      })
      .join('\n\n\n');

    const chunkName = `chunk_${String(i + 1).padStart(3, '0')}.txt`;
    const chunkPath = path.join(outputDir, chunkName);
    fs.writeFileSync(chunkPath, `${chunkBody}\n`, 'utf8');

    chunkFiles.push({
      name: chunkName,
      path: chunkPath,
      sections: `${startSection + 1}-${endSection}`,
      sectionCount: endSection - startSection
    });

    console.log(
      `Created: ${chunkName} (sections ${startSection + 1}-${endSection})`
    );
  }

  const manifest: Manifest = {
    originalFile: path.basename(inputPath),
    inputType: 'epub',
    totalSections,
    sectionsPerChunk,
    totalChunks,
    chunks: chunkFiles.map(c => ({ name: c.name, sections: c.sections, sectionCount: c.sectionCount }))
  };

  const manifestPath = writeManifest(outputDir, manifest);
  console.log(`\nDone! Created ${totalChunks} chunks in: ${outputDir}`);
  console.log(`Manifest saved to: ${manifestPath}`);

  return manifest;
}

async function splitDocument(inputPath: string, unitsPerChunk = 5, outputDir: string | null = null): Promise<Manifest> {
  const { ext } = resolveInputMeta(inputPath);

  if (ext === '.pdf') {
    return splitPdf(inputPath, unitsPerChunk, outputDir);
  }

  if (ext === '.epub') {
    return splitEpub(inputPath, unitsPerChunk, outputDir);
  }

  throw new Error(
    `Unsupported file type: ${ext || '(none)'} (expected .pdf or .epub)`
  );
}

function printUsage(): void {
  console.log(`
Usage: tsx chunk_document.ts <input.pdf|input.epub> [options]

Options:
  -p, --pages <n>     Pages/sections per chunk (default: 5)
  -o, --output <dir>  Output directory (default: <input>_chunks/)
  -h, --help          Show this help message

Examples:
  tsx chunk_document.ts book.pdf
  tsx chunk_document.ts book.pdf -p 10
  tsx chunk_document.ts book.epub -p 8
  tsx chunk_document.ts book.pdf -p 5 -o ./chunks
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  let inputPath: string | null = null;
  let pagesPerChunk = 5;
  let outputDir: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-p' || arg === '--pages') {
      pagesPerChunk = parseInt(args[++i], 10);
      if (isNaN(pagesPerChunk) || pagesPerChunk < 1) {
        console.error('Error: Pages per chunk must be a positive number');
        process.exit(1);
      }
    } else if (arg === '-o' || arg === '--output') {
      outputDir = args[++i];
    } else if (!arg.startsWith('-')) {
      inputPath = arg;
    }
  }

  if (!inputPath) {
    console.error('Error: No input file specified');
    printUsage();
    process.exit(1);
  }

  try {
    await splitDocument(inputPath, pagesPerChunk, outputDir);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

// Only run when executed directly, not when imported
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
