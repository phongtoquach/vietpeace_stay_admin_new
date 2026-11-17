const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZipStore(entries) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = typeof entry.content === 'string'
      ? encoder.encode(entry.content)
      : entry.content;
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 file name flag
    lv.setUint16(8, 0, true); // STORE (no compression)
    lv.setUint16(10, 0x0000, true);
    lv.setUint16(12, 0x5421, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0x0000, true);
    cv.setUint16(14, 0x5421, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = new Uint8Array(22);
  const ev = new DataView(endRecord.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalSize = offset + centralSize + endRecord.length;
  const output = new Uint8Array(totalSize);
  let cursor = 0;
  for (const part of localParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  output.set(endRecord, cursor);
  return output;
}

function stripInvalidXmlChars(input) {
  const str = String(input ?? '');
  let out = '';
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    if (code === 0x9 || code === 0xa || code === 0xd || code >= 0x20) {
      out += str[i];
    }
  }
  return out;
}

function escapeXml(value) {
  return stripInvalidXmlChars(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colLetters(zeroIdx) {
  let n = zeroIdx + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function sanitizeSheetName(rawName, usedNames) {
  const cleaned = String(rawName || 'Sheet')
    .replace(/[:\\/?*[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 31) || 'Sheet';
  let candidate = cleaned;
  let counter = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    const suffix = ` (${counter})`;
    candidate = `${cleaned.slice(0, 31 - suffix.length)}${suffix}`;
    counter += 1;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function buildStylesXml() {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    '<numFmts count="2">',
    '<numFmt numFmtId="164" formatCode="#,##0"/>',
    '<numFmt numFmtId="165" formatCode="0.00&quot;%&quot;"/>',
    '</numFmts>',
    '<fonts count="7">',
    '<font><sz val="10.5"/><color rgb="FF1E293B"/><name val="Segoe UI"/></font>',
    '<font><b/><sz val="13"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>',
    '<font><i/><sz val="10"/><color rgb="FF64748B"/><name val="Segoe UI"/></font>',
    '<font><b/><sz val="10.5"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/></font>',
    '<font><b/><sz val="10.5"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>',
    '<font><b/><sz val="10.5"/><color rgb="FFB91C1C"/><name val="Segoe UI"/></font>',
    '<font><b/><sz val="10.5"/><color rgb="FF15803D"/><name val="Segoe UI"/></font>',
    '</fonts>',
    '<fills count="6">',
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEEF2F6"/></patternFill></fill>',
    '</fills>',
    '<borders count="4">',
    '<border><left/><right/><top/><bottom/><diagonal/></border>',
    '<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>',
    '<border><left style="thin"><color rgb="FF334155"/></left><right style="thin"><color rgb="FF334155"/></right><top style="thin"><color rgb="FF334155"/></top><bottom style="thin"><color rgb="FF334155"/></bottom><diagonal/></border>',
    '<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="medium"><color rgb="FF0F172A"/></top><bottom style="double"><color rgb="FF0F172A"/></bottom><diagonal/></border>',
    '</borders>',
    '<cellStyleXfs count="1">',
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>',
    '</cellStyleXfs>',
    '<cellXfs count="25">',
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>',
    '<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>',
    '<xf numFmtId="0" fontId="3" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>',
    '<xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>',
    '<xf numFmtId="164" fontId="6" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>',
    '<xf numFmtId="164" fontId="6" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>',
    '<xf numFmtId="164" fontId="5" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>',
    '<xf numFmtId="164" fontId="5" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>',
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>',
    '<xf numFmtId="165" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>',
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="4" fillId="5" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>',
    '<xf numFmtId="164" fontId="4" fillId="5" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>',
    '<xf numFmtId="164" fontId="5" fillId="5" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>',
    '<xf numFmtId="164" fontId="6" fillId="5" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>',
    '<xf numFmtId="165" fontId="4" fillId="5" borderId="3" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>',
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>',
    '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>',
    '</cellXfs>',
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
    '<dxfs count="0"/>',
    '<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>',
    '</styleSheet>',
  ].join('');
}

function estimateDisplayLength(value, col) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (col.type === 'percent') return `${value.toFixed(2)}%`.length;
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 }).length;
  }
  return String(value).length;
}

function resolveBodyStyle(col, rawVal, isOddRow) {
  const odd = isOddRow ? 1 : 0;
  if (col.type === 'currency') {
    const num = typeof rawVal === 'number' && Number.isFinite(rawVal) ? rawVal : null;
    if (col.colorBySign && num !== null) {
      if (num < 0) return 12 + odd;
      if (num > 0) return 10 + odd;
    }
    return 8 + odd;
  }
  if (col.type === 'percent') return 14 + odd;
  if (col.type === 'integer') return 16 + odd;
  if (col.align === 'center') return 6 + odd;
  if (col.wrap) return 23 + odd;
  return 4 + odd;
}

function resolveSummaryStyle(col, rawVal) {
  if (col.type === 'currency') {
    const num = typeof rawVal === 'number' && Number.isFinite(rawVal) ? rawVal : null;
    if (col.colorBySign && num !== null) {
      if (num < 0) return 20;
      if (num > 0) return 21;
    }
    return 19;
  }
  if (col.type === 'percent') return 22;
  return 18;
}

function renderCellXml(ref, value, styleId) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}" s="${styleId}"><v>${value}</v></c>`;
  }
  const str = String(value ?? '');
  return `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(str)}</t></is></c>`;
}

function buildWorksheetXml(sheet) {
  const columns = sheet.columns || [];
  const rows = sheet.rows || [];
  const colCount = Math.max(1, columns.length);
  const lastColLetter = colLetters(colCount - 1);

  const widths = columns.map((col) => {
    const headerLines = String(col.header || '').split('\n');
    const maxHeaderLen = Math.max(...headerLines.map((l) => l.length), 6);
    let maxValLen = maxHeaderLen;
    for (const row of rows) {
      const raw = typeof col.value === 'function' ? col.value(row) : row?.[col.key];
      const len = estimateDisplayLength(raw, col);
      if (len > maxValLen) maxValLen = len;
    }
    if (sheet.summaryRow) {
      const sumRaw = typeof col.value === 'function' ? col.value(sheet.summaryRow) : sheet.summaryRow?.[col.key];
      const sumLen = estimateDisplayLength(sumRaw, col);
      if (sumLen > maxValLen) maxValLen = sumLen;
    }
    const minW = col.minWidth || 10;
    const maxW = col.maxWidth || 44;
    return Math.min(maxW, Math.max(minW, maxValLen + 4));
  });

  const rowXmlList = [];
  let rowIndex = 1;

  // Row 1: Report Title Banner
  const titleCells = [renderCellXml(`A${rowIndex}`, sheet.title || sheet.name || 'Báo cáo', 1)];
  for (let c = 1; c < colCount; c += 1) {
    titleCells.push(`<c r="${colLetters(c)}${rowIndex}" s="1"/>`);
  }
  rowXmlList.push(`<row r="${rowIndex}" ht="28" customHeight="1">${titleCells.join('')}</row>`);
  rowIndex += 1;

  // Row 2: Subtitle / Period Banner
  const subtitleCells = [renderCellXml(`A${rowIndex}`, sheet.subtitle || '', 2)];
  for (let c = 1; c < colCount; c += 1) {
    subtitleCells.push(`<c r="${colLetters(c)}${rowIndex}" s="2"/>`);
  }
  rowXmlList.push(`<row r="${rowIndex}" ht="20" customHeight="1">${subtitleCells.join('')}</row>`);
  rowIndex += 1;

  // Row 3: Blank spacer
  rowXmlList.push(`<row r="${rowIndex}" ht="10" customHeight="1"/>`);
  rowIndex += 1;

  // Row 4: Table Header
  const headerRowNum = rowIndex;
  const headerCells = columns.map((col, idx) => renderCellXml(`${colLetters(idx)}${rowIndex}`, col.header, 3));
  rowXmlList.push(`<row r="${rowIndex}" ht="30" customHeight="1">${headerCells.join('')}</row>`);
  rowIndex += 1;

  // Data rows
  rows.forEach((row, rIdx) => {
    const isOdd = rIdx % 2 === 1;
    const cells = columns.map((col, cIdx) => {
      const raw = typeof col.value === 'function' ? col.value(row, rIdx) : row?.[col.key];
      const numericOk =
        (col.type === 'currency' || col.type === 'percent' || col.type === 'integer') &&
        raw !== null &&
        raw !== undefined &&
        raw !== '' &&
        Number.isFinite(Number(raw));
      const val = numericOk ? Number(raw) : raw ?? '';
      const styleId = resolveBodyStyle(col, val, isOdd);
      return renderCellXml(`${colLetters(cIdx)}${rowIndex}`, val, styleId);
    });
    rowXmlList.push(`<row r="${rowIndex}" ht="22" customHeight="1">${cells.join('')}</row>`);
    rowIndex += 1;
  });

  const lastDataRowNum = rowIndex - 1;

  // Optional Summary / Total row
  if (sheet.summaryRow) {
    const sumCells = columns.map((col, cIdx) => {
      const raw = typeof col.value === 'function'
        ? col.value(sheet.summaryRow, -1)
        : sheet.summaryRow?.[col.key];
      const numericOk =
        (col.type === 'currency' || col.type === 'percent' || col.type === 'integer') &&
        raw !== null &&
        raw !== undefined &&
        raw !== '' &&
        Number.isFinite(Number(raw));
      const val = numericOk ? Number(raw) : raw ?? '';
      const styleId = resolveSummaryStyle(col, val);
      return renderCellXml(`${colLetters(cIdx)}${rowIndex}`, val, styleId);
    });
    rowXmlList.push(`<row r="${rowIndex}" ht="24" customHeight="1">${sumCells.join('')}</row>`);
    rowIndex += 1;
  }

  const totalRows = rowIndex - 1;
  const colsXml = widths
    .map((w, idx) => `<col min="${idx + 1}" max="${idx + 1}" width="${w.toFixed(1)}" customWidth="1"/>`)
    .join('');

  const autoFilterXml = rows.length > 0
    ? `<autoFilter ref="A${headerRowNum}:${lastColLetter}${lastDataRowNum}"/>`
    : '';

  const mergeCellsXml = colCount > 1
    ? `<mergeCells count="2"><mergeCell ref="A1:${lastColLetter}1"/><mergeCell ref="A2:${lastColLetter}2"/></mergeCells>`
    : '';

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    `<dimension ref="A1:${lastColLetter}${totalRows}"/>`,
    '<sheetViews>',
    `<sheetView workbookViewId="0"><pane ySplit="${headerRowNum}" topLeftCell="A${headerRowNum + 1}" activePane="bottomLeft" state="frozen"/></sheetView>`,
    '</sheetViews>',
    '<sheetFormatPr defaultRowHeight="20"/>',
    `<cols>${colsXml}</cols>`,
    `<sheetData>${rowXmlList.join('')}</sheetData>`,
    autoFilterXml,
    mergeCellsXml,
    '<pageSetup orientation="landscape" paperSize="9" fitToWidth="1" fitToHeight="0"/>',
    '</worksheet>',
  ].join('');
}

export function buildXlsxBytes(sheets = []) {
  const usedNames = new Set();
  const normalizedSheets = (sheets.length > 0 ? sheets : [{ name: 'Bao cao', columns: [{ header: 'Thông tin', key: 'info' }], rows: [] }]).map(
    (s) => ({
      ...s,
      safeName: sanitizeSheetName(s.name, usedNames),
    }),
  );

  const contentTypesXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
    ...normalizedSheets.map(
      (_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    ),
    '</Types>',
  ].join('');

  const rootRelsXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
    '</Relationships>',
  ].join('');

  const workbookXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<fileVersion appName="xl"/>',
    '<sheets>',
    ...normalizedSheets.map(
      (s, i) => `<sheet name="${escapeXml(s.safeName)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
    ),
    '</sheets>',
    '</workbook>',
  ].join('');

  const workbookRelsXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    ...normalizedSheets.map(
      (_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    ),
    `<Relationship Id="rId${normalizedSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
    '</Relationships>',
  ].join('');

  const entries = [
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: rootRelsXml },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { name: 'xl/styles.xml', content: buildStylesXml() },
    ...normalizedSheets.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      content: buildWorksheetXml(s),
    })),
  ];

  return buildZipStore(entries);
}

function triggerBlobDownload(filename, blob) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export function downloadExcelWorkbook(filename, sheets) {
  const bytes = buildXlsxBytes(sheets);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerBlobDownload(filename, blob);
}

function csvCell(value) {
  const raw = String(value ?? '').replace(/\r?\n/g, ' ');
  const safe = /^[=+@\t]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename, rows) {
  // Encode as UTF-16LE with BOM and Tab delimiter so Microsoft Excel splits columns cleanly across all locales
  const content = rows.map((row) => row.map(csvCell).join('\t')).join('\r\n');
  const bytes = new Uint8Array(2 + content.length * 2);
  bytes[0] = 0xff;
  bytes[1] = 0xfe;
  for (let i = 0; i < content.length; i += 1) {
    const code = content.charCodeAt(i);
    bytes[2 + i * 2] = code & 0xff;
    bytes[2 + i * 2 + 1] = code >> 8;
  }
  const blob = new Blob([bytes], { type: 'text/csv;charset=utf-16le;' });
  triggerBlobDownload(filename, blob);
}
