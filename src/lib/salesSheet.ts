export type SalesSheetReport = {
  periodName: string;
  revenue: number;
  spent: number;
  net: number;
  transactions: number;
  average: number;
  orders: { createdAt: string; payment: string; total: number }[];
  trendTitle: string;
  points: { label: string; total: number }[];
  emptyOrders: string;
};

type SheetTone = 'title' | 'subtitle' | 'accent' | 'section' | 'head' | 'label' | 'gross' | 'spend' | 'netUp' | 'netDown' | 'plain' | 'stripe' | 'good' | 'peak' | 'muted' | 'total' | 'gap' | 'foot';
type SheetCell = { value?: string | number; tone: SheetTone; span?: number; align?: 'left' | 'right' | 'center'; strong?: boolean };

const tones: Record<SheetTone, { bg: string; color: string; bold?: boolean; size?: string; pad?: string; border?: string; fontSize?: string }> = {
  title: { bg: '#3A1C0E', color: '#FFF8EF', bold: true, size: '20pt', fontSize: '5', pad: '16px 16px', border: 'none' },
  subtitle: { bg: '#5C2E16', color: '#F6E2CC', bold: true, size: '12pt', fontSize: '3', pad: '7px 16px 10px', border: 'none' },
  accent: { bg: '#E0A84A', color: '#E0A84A', size: '3pt', pad: '1px 0', border: 'none' },
  section: { bg: '#7A3E16', color: '#FFF6EB', bold: true, size: '11pt', pad: '8px 14px', border: 'none' },
  head: { bg: '#3A1C0E', color: '#FFF4E8', bold: true, size: '10pt', pad: '8px 12px' },
  label: { bg: '#FFFDF9', color: '#3A2418', bold: true, pad: '8px 14px' },
  gross: { bg: '#E5F6EC', color: '#146C43', bold: true, pad: '9px 14px' },
  spend: { bg: '#FFF3E0', color: '#8A4E12', bold: true, pad: '9px 14px' },
  netUp: { bg: '#CDEFD9', color: '#0E6A3E', bold: true, size: '13pt', fontSize: '4', pad: '11px 14px' },
  netDown: { bg: '#F8D6D2', color: '#8E241F', bold: true, size: '13pt', fontSize: '4', pad: '11px 14px' },
  plain: { bg: '#FFFFFF', color: '#2A1810', pad: '7px 12px' },
  stripe: { bg: '#F8F1E8', color: '#2A1810', pad: '7px 12px' },
  good: { bg: '#E5F6EC', color: '#146C43', bold: true, pad: '7px 12px' },
  peak: { bg: '#B7E4C7', color: '#0C5A34', bold: true, pad: '7px 12px' },
  muted: { bg: '#FBF7F2', color: '#8A7568', pad: '7px 12px' },
  total: { bg: '#3A1C0E', color: '#FFF8EF', bold: true, pad: '9px 12px' },
  gap: { bg: '#FFFFFF', color: '#FFFFFF', size: '8pt', pad: '0', border: 'none' },
  foot: { bg: '#FFFFFF', color: '#8A7568', size: '9pt', pad: '12px 2px 4px', border: 'none' },
};

const keepToneColor = new Set<SheetTone>(['title', 'subtitle', 'accent', 'section', 'head', 'gross', 'spend', 'netUp', 'netDown', 'good', 'peak', 'muted', 'total', 'foot']);

function escapeSheet(value: string | number) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function sheetMoney(value: number) {
  const formatted = Math.abs(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value < 0 ? `-₱${formatted}` : `₱${formatted}`;
}

function sheetCell(cell: SheetCell) {
  const tone = tones[cell.tone];
  const color = cell.strong && !keepToneColor.has(cell.tone) ? '#5C2E16' : tone.color;
  const bold = Boolean(tone.bold || cell.strong);
  const border = tone.border ?? '1px solid #E7D9CC';
  const align = cell.align ?? 'left';
  const size = tone.size ? `font-size:${tone.size};` : 'font-size:11pt;';
  const asText = "mso-number-format:'\\@';";
  const pad = tone.pad ?? '8px 12px';
  const span = cell.span && cell.span > 1 ? ` colspan="${cell.span}"` : '';
  const raw = cell.value === undefined || cell.value === '' ? '&nbsp;' : escapeSheet(cell.value);
  const sized = tone.fontSize ? `<font color="${color}" size="${tone.fontSize}">${raw}</font>` : `<font color="${color}">${raw}</font>`;
  const inner = bold ? `<b>${sized}</b>` : sized;
  return `<td bgcolor="${tone.bg}" align="${align}"${span} style="background:${tone.bg};color:${color};${bold ? 'font-weight:700;' : ''}${size}${asText}font-family:Calibri,Arial,sans-serif;text-align:${align};vertical-align:middle;padding:${pad};border:${border};white-space:nowrap;">${inner}</td>`;
}

function sheetRow(cells: SheetCell[]) {
  const tone = cells[0]?.tone;
  const height = tone === 'title' ? ' style="height:40px"' : tone === 'accent' ? ' style="height:6px"' : tone === 'gap' ? ' style="height:14px"' : tone === 'netUp' || tone === 'netDown' ? ' style="height:28px"' : '';
  return `<tr${height}>${cells.map(sheetCell).join('')}</tr>`;
}

export function salesSheetHtml(report: SalesSheetReport, exportedAt = new Date()) {
  const netTone: SheetTone = report.net < 0 ? 'netDown' : 'netUp';
  const peak = Math.max(...report.points.map(point => point.total), 0);
  const orderRows: SheetCell[][] = report.orders.length
    ? report.orders.map((sale, index) => {
        const when = new Date(sale.createdAt);
        const tone: SheetTone = index % 2 ? 'stripe' : 'plain';
        return [
          { value: when.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }), tone },
          { value: when.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }), tone },
          { value: sale.payment, tone, align: 'center' },
          { value: sheetMoney(sale.total), tone, align: 'right', strong: true },
        ];
      })
    : [[{ value: report.emptyOrders, tone: 'muted', span: 4 }]];
  const trendRows: SheetCell[][] = report.points.map(point => {
    const tone: SheetTone = point.total <= 0 ? 'muted' : point.total === peak ? 'peak' : 'good';
    const row: SheetCell[] = [
      { value: point.label, tone, span: 3 },
      { value: sheetMoney(point.total), tone, align: 'right' },
    ];
    return row;
  });
  const rows: SheetCell[][] = [
    [{ value: 'DQ Cafe', tone: 'title', span: 4 }],
    [{ value: `Sales report   ·   ${report.periodName}`, tone: 'subtitle', span: 4 }],
    [{ tone: 'accent', span: 4 }],
    [{ value: 'SUMMARY', tone: 'section', span: 4 }],
    [{ value: 'Gross income', tone: 'gross', span: 3 }, { value: sheetMoney(report.revenue), tone: 'gross', align: 'right' }],
    [{ value: 'Expenses', tone: 'spend', span: 3 }, { value: sheetMoney(report.spent), tone: 'spend', align: 'right' }],
    [{ value: 'Net income', tone: netTone, span: 3 }, { value: sheetMoney(report.net), tone: netTone, align: 'right' }],
    [{ value: 'Transactions', tone: 'label', span: 3 }, { value: report.transactions, tone: 'label', align: 'right' }],
    [{ value: 'Average order', tone: 'label', span: 3 }, { value: sheetMoney(report.average), tone: 'label', align: 'right', strong: true }],
    [{ tone: 'gap', span: 4 }],
    [{ value: 'ORDERS', tone: 'section', span: 4 }],
    [
      { value: 'Date', tone: 'head' },
      { value: 'Time', tone: 'head' },
      { value: 'Payment', tone: 'head', align: 'center' },
      { value: 'Total', tone: 'head', align: 'right' },
    ],
    ...orderRows,
    [
      { value: report.transactions === 1 ? '1 order' : `${report.transactions} orders`, tone: 'total', span: 3 },
      { value: sheetMoney(report.revenue), tone: 'total', align: 'right' },
    ],
    [{ tone: 'gap', span: 4 }],
    [{ value: 'REVENUE TREND', tone: 'section', span: 4 }],
    [{ value: report.trendTitle, tone: 'head', span: 3 }, { value: 'Total', tone: 'head', align: 'right' }],
    ...trendRows,
    [{ value: `Exported ${exportedAt.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`, tone: 'foot', span: 4 }],
  ];
  const table = rows.map(sheetRow).join('');
  return `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sales</x:Name><x:WorksheetOptions><x:DoNotDisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table style="border-collapse:collapse;"><col width="220"><col width="140"><col width="130"><col width="160">${table}</table></body></html>`;
}

export function downloadSalesSheet(filename: string, report: SalesSheetReport) {
  const html = salesSheetHtml(report);
  const blob = new Blob(['\uFEFF', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
