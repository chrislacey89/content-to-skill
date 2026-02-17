#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const JSZip = require('jszip');
const { XMLParser } = require('fast-xml-parser');
const { convert } = require('html-to-text');

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeText(text) {
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

function resolveInputMeta(inputPath) {
  const extWithCase = path.extname(inputPath);
  return {
    ext: extWithCase.toLowerCase(),
    name: path.basename(inputPath, extWithCase)
  };
}

function ensureInputExists(inputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`File not found: ${inputPath}`);
  }
  if (!fs.statSync(inputPath).isFile()) {
    throw new Error(`Path is not a file: ${inputPath}`);
  }
}

function ensureOutputDir(outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

function writeManifest(outputDir, manifest) {
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return manifestPath;
}

function checkFileSize(inputPath) {
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

async function splitPdf(inputPath, pagesPerChunk = 5, outputDir = null) {
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

  const chunkFiles = [];

  for (let i = 0; i < totalChunks; i++) {
    const startPage = i * pagesPerChunk;
    const endPage = Math.min(startPage + pagesPerChunk, totalPages);

    const chunkPdf = await PDFDocument.create();

    const pageIndices = [];
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

  const manifest = {
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

async function readZipTextFile(zip, filePath) {
  const exact = zip.file(filePath);
  if (exact) return exact.async('text');

  const decodedPath = filePath.includes('%') ? decodeURIComponent(filePath) : filePath;
  const decoded = zip.file(decodedPath);
  if (decoded) return decoded.async('text');

  return null;
}

async function extractEpubSections(inputPath) {
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

  const manifestById = new Map();
  for (const item of manifestItems) {
    if (item?.id && item?.href) {
      manifestById.set(item.id, item);
    }
  }

  const opfDirRaw = path.posix.dirname(rootfilePath);
  const opfDir = opfDirRaw === '.' ? '' : opfDirRaw;

  const sections = [];
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
      sections.push({
        sourcePath: sectionPath,
        text
      });
    }
  }

  if (sections.length === 0) {
    throw new Error('No readable spine text sections found in EPUB');
  }

  return sections;
}

async function splitEpub(inputPath, sectionsPerChunk = 5, outputDir = null) {
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

  const chunkFiles = [];
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

  const manifest = {
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

async function splitDocument(inputPath, unitsPerChunk = 5, outputDir = null) {
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

function printUsage() {
  console.log(`
Usage: node chunk_document.js <input.pdf|input.epub> [options]

Options:
  -p, --pages <n>     Pages/sections per chunk (default: 5)
  -o, --output <dir>  Output directory (default: <input>_chunks/)
  -h, --help          Show this help message

Examples:
  node chunk_document.js book.pdf
  node chunk_document.js book.pdf -p 10
  node chunk_document.js book.epub -p 8
  node chunk_document.js book.pdf -p 5 -o ./chunks
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  let inputPath = null;
  let pagesPerChunk = 5;
  let outputDir = null;

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
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
