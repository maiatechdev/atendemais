// Conversor de Markdown -> PDF usando marked + puppeteer.
// Uso: node scripts/md2pdf.js <entrada.md> <saida.pdf>
const fs = require('fs');
const { marked } = require('marked');
const puppeteer = require('puppeteer');

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error('Uso: node scripts/md2pdf.js <entrada.md> <saida.pdf>');
  process.exit(1);
}

const md = fs.readFileSync(inputPath, 'utf-8');
const bodyHtml = marked.parse(md);

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  body {
    font-family: -apple-system, "Segoe UI", Arial, sans-serif;
    color: #1f2937;
    font-size: 11pt;
    line-height: 1.5;
  }
  h1 {
    color: #2563eb;
    font-size: 22pt;
    border-bottom: 2px solid #2563eb;
    padding-bottom: 6px;
    margin-top: 0;
  }
  h2 {
    color: #2563eb;
    font-size: 15pt;
    border-left: 4px solid #2563eb;
    padding-left: 8px;
    margin-top: 26px;
  }
  h3 {
    color: #1d4ed8;
    font-size: 12.5pt;
    margin-top: 18px;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0;
    font-size: 10pt;
  }
  th, td {
    border: 1px solid #d1d5db;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }
  th { background: #eff6ff; color: #1d4ed8; }
  code {
    background: #f1f5f9;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 9.5pt;
  }
  pre {
    background: #0f172a;
    color: #e2e8f0;
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 9.5pt;
  }
  pre code { background: none; color: inherit; padding: 0; }
  blockquote {
    border-left: 4px solid #f59e0b;
    background: #fffbeb;
    margin: 12px 0;
    padding: 6px 12px;
    color: #92400e;
  }
  ul, ol { padding-left: 22px; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 22px 0; }
  li input[type="checkbox"] { margin-right: 6px; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '28mm', bottom: '22mm', left: '18mm', right: '18mm' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `<div style="font-size:8pt;color:#9ca3af;width:100%;text-align:center;">
      <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>`,
  });
  await browser.close();
  console.log('PDF gerado em:', outputPath);
})();
