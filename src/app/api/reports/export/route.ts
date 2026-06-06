import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { verifyApiAuth } from '@/lib/apiAuth';
import { handleCorsOptions, withCors } from '@/lib/cors';
import { buildReportData, buildCollectionRows, type ReportFilters } from '@/lib/reportData';

export const runtime = 'nodejs';

// Handle OPTIONS preflight for CORS
export async function OPTIONS(request: NextRequest) {
    return handleCorsOptions(request);
}

const COLUMNS = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Member', key: 'member', width: 24 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Group', key: 'group', width: 24 },
    { header: 'Period', key: 'period', width: 10 },
    { header: 'Amount Due', key: 'amountDue', width: 14 },
    { header: 'Amount Paid', key: 'amountPaid', width: 14 },
    { header: 'Mode', key: 'paymentMode', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
];

function csvEscape(value: any): string {
    const str = value === null || value === undefined ? '' : String(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin');
    const user = await verifyApiAuth(request);
    if (!user) {
        return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), origin);
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const filters: ReportFilters = {
        startDate: searchParams.get('startDate'),
        endDate: searchParams.get('endDate'),
        groupId: searchParams.get('groupId'),
        paymentMode: searchParams.get('paymentMode'),
    };

    try {
        const rows = await buildCollectionRows(user, filters);
        const stamp = new Date().toISOString().slice(0, 10);
        const filename = `chitwise_collections_${stamp}`;

        // ---- CSV ----
        if (format === 'csv') {
            const headerLine = COLUMNS.map((c) => c.header).join(',');
            const body = rows
                .map((r: any) => COLUMNS.map((c) => csvEscape(r[c.key])).join(','))
                .join('\n');
            const csv = `${headerLine}\n${body}`;
            return new NextResponse(csv, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${filename}.csv"`,
                },
            });
        }

        // ---- Excel (xlsx) ----
        if (format === 'excel' || format === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'ChitWise';
            workbook.created = new Date();
            const sheet = workbook.addWorksheet('Collections');
            sheet.columns = COLUMNS as any;
            sheet.getRow(1).font = { bold: true };
            rows.forEach((r: any) => sheet.addRow(r));

            const buffer = await workbook.xlsx.writeBuffer();
            return new NextResponse(buffer as any, {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
                },
            });
        }

        // ---- PDF ----
        if (format === 'pdf') {
            const report = await buildReportData(user, filters);
            const pdf = await PDFDocument.create();
            const font = await pdf.embedFont(StandardFonts.Helvetica);
            const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

            let page = pdf.addPage([595, 842]); // A4 portrait
            const margin = 40;
            let y = 800;

            const draw = (text: string, x: number, size = 10, bold = false, color = rgb(0.1, 0.1, 0.1)) => {
                page.drawText(text, { x, y, size, font: bold ? fontBold : font, color });
            };

            draw('ChitWise — Collections Report', margin, 18, true);
            y -= 24;
            draw(`Generated: ${new Date().toLocaleString()}`, margin, 9, false, rgb(0.4, 0.4, 0.4));
            y -= 24;

            // Summary
            draw('Summary', margin, 12, true);
            y -= 16;
            draw(`Total Collected: ${report.summary.totalCollected.toLocaleString()}`, margin, 10);
            y -= 14;
            draw(`Outstanding: ${report.summary.totalOutstanding.toLocaleString()}`, margin, 10);
            y -= 14;
            draw(`Active Groups: ${report.summary.activeGroups}   Active Members: ${report.summary.activeMembers}   Defaulters: ${report.summary.defaulterCount}`, margin, 10);
            y -= 26;

            // Table header
            const cols = [
                { label: 'Date', x: margin, w: 70 },
                { label: 'Member', x: margin + 70, w: 130 },
                { label: 'Group', x: margin + 200, w: 150 },
                { label: 'Paid', x: margin + 350, w: 70 },
                { label: 'Mode', x: margin + 440, w: 70 },
            ];
            draw('Recent Collections', margin, 12, true);
            y -= 16;
            cols.forEach((c) => { page.drawText(c.label, { x: c.x, y, size: 9, font: fontBold }); });
            y -= 4;
            page.drawLine({ start: { x: margin, y }, end: { x: 555, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
            y -= 14;

            const list = rows.slice(0, 40);
            for (const r of list) {
                if (y < 50) {
                    page = pdf.addPage([595, 842]);
                    y = 800;
                }
                const cells = [
                    String(r.date),
                    String(r.member).slice(0, 24),
                    String(r.group).slice(0, 28),
                    String(r.amountPaid.toLocaleString()),
                    String(r.paymentMode),
                ];
                cells.forEach((cell, i) => {
                    page.drawText(cell, { x: cols[i].x, y, size: 8, font, color: rgb(0.15, 0.15, 0.15) });
                });
                y -= 13;
            }

            const bytes = await pdf.save();
            return new NextResponse(bytes as any, {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${filename}.pdf"`,
                },
            });
        }

        return withCors(NextResponse.json({ error: 'Unsupported format' }, { status: 400 }), origin);
    } catch (error: any) {
        console.error('Reports export error:', error);
        return withCors(NextResponse.json({ error: error.message || 'Failed to export report' }, { status: 500 }), origin);
    }
}
