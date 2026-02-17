#!/usr/bin/env tsx
/**
 * Creates test fixtures: a 2-page PDF and a minimal valid EPUB.
 * Run once: npx tsx tests/create-fixtures.ts
 */
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

const FIXTURES_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), "fixtures");

async function createSamplePdf() {
	const doc = await PDFDocument.create();

	const page1 = doc.addPage([612, 792]);
	page1.drawText("Page 1: Hello World", { x: 50, y: 700, size: 24 });
	page1.drawText("This is the first page of the test PDF fixture.", { x: 50, y: 660, size: 12 });

	const page2 = doc.addPage([612, 792]);
	page2.drawText("Page 2: Second Page", { x: 50, y: 700, size: 24 });
	page2.drawText("This is the second page of the test PDF fixture.", { x: 50, y: 660, size: 12 });

	const pdfBytes = await doc.save();
	const outPath = path.join(FIXTURES_DIR, "sample.pdf");
	fs.writeFileSync(outPath, pdfBytes);
	console.log(`Created: ${outPath} (${pdfBytes.length} bytes)`);
}

async function createSampleEpub() {
	const zip = new JSZip();

	// mimetype (must be first, uncompressed)
	zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

	// container.xml
	zip.file(
		"META-INF/container.xml",
		`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
	);

	// content.opf
	zip.file(
		"OEBPS/content.opf",
		`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-epub-001</dc:identifier>
    <dc:title>Test EPUB</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch3" href="chapter3.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
    <itemref idref="ch3"/>
  </spine>
</package>`,
	);

	// Chapter 1
	zip.file(
		"OEBPS/chapter1.xhtml",
		`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter 1</title></head>
<body>
<h1>Chapter 1: Introduction</h1>
<p>This is the first chapter of the test EPUB. It contains introductory material for testing purposes.</p>
<p>The chunking algorithm should be able to extract this text correctly.</p>
</body>
</html>`,
	);

	// Chapter 2
	zip.file(
		"OEBPS/chapter2.xhtml",
		`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter 2</title></head>
<body>
<h1>Chapter 2: Main Content</h1>
<p>This is the second chapter with the main content. It covers key topics and frameworks.</p>
<p>Multiple paragraphs ensure the text extraction handles various HTML structures.</p>
</body>
</html>`,
	);

	// Chapter 3
	zip.file(
		"OEBPS/chapter3.xhtml",
		`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter 3</title></head>
<body>
<h1>Chapter 3: Conclusion</h1>
<p>This is the third and final chapter. It wraps up the content.</p>
</body>
</html>`,
	);

	const epubBytes = await zip.generateAsync({ type: "nodebuffer" });
	const outPath = path.join(FIXTURES_DIR, "sample.epub");
	fs.writeFileSync(outPath, epubBytes);
	console.log(`Created: ${outPath} (${epubBytes.length} bytes)`);
}

await createSamplePdf();
await createSampleEpub();
console.log("Done!");
