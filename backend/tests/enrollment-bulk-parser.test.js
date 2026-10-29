import test from 'node:test';
import assert from 'node:assert/strict';
import AdmZip from 'adm-zip';
import { parseBulkEnrollmentFile } from '../services/enrollment.service.js';

const createWorkbookBuffer = () => {
  const zip = new AdmZip();
  zip.addFile(
    'xl/sharedStrings.xml',
    Buffer.from(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="3" uniqueCount="3">
        <si><t>email</t></si>
        <si><t>first@example.com</t></si>
        <si><t>second@example.com</t></si>
      </sst>`,
      'utf8'
    )
  );
  zip.addFile(
    'xl/worksheets/sheet1.xml',
    Buffer.from(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <sheetData>
          <row r="1">
            <c r="A1" t="s"><v>0</v></c>
          </row>
          <row r="2">
            <c r="A2" t="s"><v>1</v></c>
          </row>
          <row r="3">
            <c r="A3" t="s"><v>2</v></c>
          </row>
        </sheetData>
      </worksheet>`,
      'utf8'
    )
  );
  return zip.toBuffer();
};

test('parseBulkEnrollmentFile reads csv email rows', async () => {
  const rows = await parseBulkEnrollmentFile({
    buffer: Buffer.from('email\nfirst@example.com\nsecond@example.com\n', 'utf8'),
    originalName: 'enrollment.csv',
  });

  assert.deepEqual(rows, [
    { rowNumber: 2, email: 'first@example.com' },
    { rowNumber: 3, email: 'second@example.com' },
  ]);
});

test('parseBulkEnrollmentFile reads xlsx email rows', async () => {
  const rows = await parseBulkEnrollmentFile({
    buffer: createWorkbookBuffer(),
    originalName: 'enrollment.xlsx',
  });

  assert.deepEqual(rows, [
    { rowNumber: 2, email: 'first@example.com' },
    { rowNumber: 3, email: 'second@example.com' },
  ]);
});

test('parseBulkEnrollmentFile rejects missing email header', async () => {
  await assert.rejects(
    parseBulkEnrollmentFile({
      buffer: Buffer.from('name\nJane Doe\n', 'utf8'),
      originalName: 'bad.csv',
    }),
    /email/
  );
});
