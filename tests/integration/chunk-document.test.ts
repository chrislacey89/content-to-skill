import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const FIXTURES_DIR = path.join(import.meta.dirname, '..', 'fixtures');
const SCRIPT = path.join(import.meta.dirname, '..', '..', 'scripts', 'chunk_document.ts');

describe('chunk_document.ts', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cts-test-chunk-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('PDF chunking', () => {
    it('exits 0 and creates manifest.json with correct schema', () => {
      const pdfPath = path.join(FIXTURES_DIR, 'sample.pdf');
      const outputDir = path.join(tmpDir, 'pdf-output');

      execSync(`npx tsx "${SCRIPT}" "${pdfPath}" -p 1 -o "${outputDir}"`, {
        stdio: 'pipe',
      });

      const manifestPath = path.join(outputDir, 'manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      expect(manifest.inputType).toBe('pdf');
      expect(manifest.originalFile).toBe('sample.pdf');
      expect(manifest.totalPages).toBe(2);
      expect(manifest.pagesPerChunk).toBe(1);
      expect(manifest.totalChunks).toBe(2);
      expect(manifest.chunks).toHaveLength(2);

      // Verify chunk file naming
      expect(manifest.chunks[0].name).toBe('chunk_001.pdf');
      expect(manifest.chunks[1].name).toBe('chunk_002.pdf');

      // Verify chunk files exist
      expect(fs.existsSync(path.join(outputDir, 'chunk_001.pdf'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'chunk_002.pdf'))).toBe(true);
    });

    it('creates single chunk when pages-per-chunk >= total pages', () => {
      const pdfPath = path.join(FIXTURES_DIR, 'sample.pdf');
      const outputDir = path.join(tmpDir, 'pdf-single');

      execSync(`npx tsx "${SCRIPT}" "${pdfPath}" -p 10 -o "${outputDir}"`, {
        stdio: 'pipe',
      });

      const manifest = JSON.parse(
        fs.readFileSync(path.join(outputDir, 'manifest.json'), 'utf8')
      );
      expect(manifest.totalChunks).toBe(1);
      expect(manifest.chunks).toHaveLength(1);
    });
  });

  describe('EPUB chunking', () => {
    it('exits 0 and creates manifest.json with correct schema', () => {
      const epubPath = path.join(FIXTURES_DIR, 'sample.epub');
      const outputDir = path.join(tmpDir, 'epub-output');

      execSync(`npx tsx "${SCRIPT}" "${epubPath}" -p 2 -o "${outputDir}"`, {
        stdio: 'pipe',
      });

      const manifestPath = path.join(outputDir, 'manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      expect(manifest.inputType).toBe('epub');
      expect(manifest.originalFile).toBe('sample.epub');
      expect(manifest.totalSections).toBe(3);
      expect(manifest.sectionsPerChunk).toBe(2);
      expect(manifest.totalChunks).toBe(2);
      expect(manifest.chunks).toHaveLength(2);

      // Verify chunk files are .txt
      expect(manifest.chunks[0].name).toBe('chunk_001.txt');
      expect(fs.existsSync(path.join(outputDir, 'chunk_001.txt'))).toBe(true);
    });
  });

  describe('error handling', () => {
    it('exits non-zero for missing file', () => {
      expect(() => {
        execSync(`npx tsx "${SCRIPT}" /nonexistent/file.pdf`, {
          stdio: 'pipe',
        });
      }).toThrow();
    });

    it('exits non-zero for unsupported extension', () => {
      const txtPath = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(txtPath, 'hello');

      expect(() => {
        execSync(`npx tsx "${SCRIPT}" "${txtPath}"`, {
          stdio: 'pipe',
        });
      }).toThrow();
    });
  });
});
