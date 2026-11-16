import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow } from 'docx';
import { convertCurriculumDocxPreview } from '../services/studioCurriculumDocuments.service.js';

test('Curriculum DOCX preview preserves headings and table structure', async () => {
  const document = new Document({
    sections: [{
      children: [
        new Paragraph({ text: 'Chapter Teaching Plan', heading: HeadingLevel.HEADING_1 }),
        new Table({
          rows: [
            new TableRow({ children: [new TableCell({ children: [new Paragraph('Session')] }), new TableCell({ children: [new Paragraph('Delivery')] })] }),
            new TableRow({ children: [new TableCell({ children: [new Paragraph('Session 1')] }), new TableCell({ children: [new Paragraph('40 minutes')] })] }),
          ],
        }),
      ],
    }],
  });

  const preview = await convertCurriculumDocxPreview(await Packer.toBuffer(document));

  assert.match(preview.html, /<h2>Chapter Teaching Plan<\/h2>/);
  assert.match(preview.html, /<table>/);
  assert.match(preview.html, /<td><p>Session<\/p><\/td>/);
  assert.match(preview.html, /<td><p>40 minutes<\/p><\/td>/);
  assert.match(preview.text, /Chapter Teaching Plan/);
});
