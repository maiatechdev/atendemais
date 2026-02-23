import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generatePDF(markdownFile, outputPdf) {
    try {
        console.log(`📄 Lendo arquivo: ${markdownFile}`);
        const markdown = fs.readFileSync(markdownFile, 'utf-8');

        console.log('🔄 Convertendo Markdown para HTML...');
        const html = await marked.parse(markdown);

        // Template HTML com estilos
        const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            margin: 2cm;
            size: A4;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 100%;
            margin: 0;
            padding: 20px;
        }
        
        h1 {
            color: #2563eb;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 10px;
            margin-top: 30px;
            font-size: 32px;
        }
        
        h2 {
            color: #1e40af;
            margin-top: 25px;
            font-size: 24px;
            border-left: 4px solid #3b82f6;
            padding-left: 15px;
        }
        
        h3 {
            color: #1e3a8a;
            margin-top: 20px;
            font-size: 20px;
        }
        
        h4 {
            color: #1e293b;
            margin-top: 15px;
            font-size: 16px;
        }
        
        code {
            background-color: #f1f5f9;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            color: #dc2626;
        }
        
        pre {
            background-color: #1e293b;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 15px 0;
            page-break-inside: avoid;
        }
        
        pre code {
            background-color: transparent;
            color: #e2e8f0;
            padding: 0;
        }
        
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 15px 0;
            page-break-inside: avoid;
        }
        
        th, td {
            border: 1px solid #cbd5e1;
            padding: 10px;
            text-align: left;
        }
        
        th {
            background-color: #3b82f6;
            color: white;
            font-weight: bold;
        }
        
        tr:nth-child(even) {
            background-color: #f8fafc;
        }
        
        blockquote {
            border-left: 4px solid #f59e0b;
            background-color: #fffbeb;
            padding: 10px 15px;
            margin: 15px 0;
            page-break-inside: avoid;
        }
        
        ul, ol {
            margin: 10px 0;
            padding-left: 30px;
        }
        
        li {
            margin: 5px 0;
        }
        
        a {
            color: #2563eb;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        hr {
            border: none;
            border-top: 2px solid #e2e8f0;
            margin: 30px 0;
        }
        
        .page-break {
            page-break-after: always;
        }
        
        /* Badges/Tags */
        strong {
            color: #1e40af;
        }
        
        /* Footer */
        @page {
            @bottom-right {
                content: "Página " counter(page) " de " counter(pages);
                font-size: 10px;
                color: #64748b;
            }
        }
    </style>
</head>
<body>
    ${html}
    <hr style="margin-top: 50px;">
    <p style="text-align: center; color: #64748b; font-size: 12px;">
        Documentação gerada automaticamente - Atende+ Web App Prototype<br>
        Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
    </p>
</body>
</html>
        `;

        console.log('🚀 Iniciando Puppeteer...');
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

        console.log('📝 Gerando PDF...');
        await page.pdf({
            path: outputPdf,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            }
        });

        await browser.close();

        console.log(`✅ PDF gerado com sucesso: ${outputPdf}`);
        return outputPdf;

    } catch (error) {
        console.error('❌ Erro ao gerar PDF:', error);
        throw error;
    }
}

// Gerar PDFs para todos os documentos
async function generateAllPDFs() {
    const currentDir = __dirname;
    const outputDir = path.join(__dirname, 'documentacao_pdf');

    // Criar diretório de saída se não existir
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const docs = [
        { input: 'dashboard_technologies.md', output: 'Tecnologias_Dashboard.pdf' },
        { input: 'priority_test_plan.md', output: 'Plano_Testes_Prioridade.pdf' },
        { input: 'test_results.md', output: 'Resultados_Testes.pdf' },
        { input: 'user_recovery_guide.md', output: 'Guia_Recuperacao_Usuarios.pdf' }
    ];

    console.log('📚 Gerando PDFs da documentação...\n');

    for (const doc of docs) {
        const inputPath = path.join(currentDir, doc.input);
        const outputPath = path.join(outputDir, doc.output);

        if (fs.existsSync(inputPath)) {
            try {
                await generatePDF(inputPath, outputPath);
                console.log(`   ✓ ${doc.output}\n`);
            } catch (error) {
                console.log(`   ✗ Erro ao gerar ${doc.output}: ${error.message}\n`);
            }
        } else {
            console.log(`   ⚠ Arquivo não encontrado: ${doc.input}\n`);
        }
    }

    console.log(`\n🎉 Processo concluído!`);
    console.log(`📁 PDFs salvos em: ${outputDir}\n`);
}

generateAllPDFs().catch(console.error);
