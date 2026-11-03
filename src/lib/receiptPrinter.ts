export type ReceiptItem = { name: string; detail: string; qty: number; unit: number; amount: number };
export type SaleReceipt = {
  orderNo: string;
  when: Date;
  payment: string;
  items: ReceiptItem[];
  total: number;
  received: number;
  change: number;
};

const WIDTH = 32;

type PrinterEndpoint = { direction: string; type: string; endpointNumber: number };
type PrinterDevice = {
  opened: boolean;
  configuration: { interfaces: { interfaceNumber: number; alternates: { endpoints: PrinterEndpoint[] }[] }[] } | null;
  open: () => Promise<void>;
  selectConfiguration: (value: number) => Promise<void>;
  claimInterface: (face: number) => Promise<void>;
  releaseInterface: (face: number) => Promise<void>;
  transferOut: (endpoint: number, data: BufferSource) => Promise<{ status: string }>;
};
type PrinterWriter = { write: (data: Uint8Array) => Promise<void>; releaseLock: () => void };
type PrinterPort = { writable: { getWriter: () => PrinterWriter } | null; open: (options: { baudRate: number }) => Promise<void> };

let usbDevice: PrinterDevice | null = null;
let serialPort: PrinterPort | null = null;

function usbApi() {
  return (navigator as Navigator & { usb?: { getDevices: () => Promise<PrinterDevice[]> } }).usb;
}

function serialApi() {
  return (navigator as Navigator & { serial?: { getPorts: () => Promise<PrinterPort[]> } }).serial;
}

const amount = (value: number) => value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function ascii(value: string) {
  return value.replace(/\u00a0|\u202f/g, ' ').replace(/₱/g, 'P').replace(/·/g, '-').replace(/[^\x20-\x7E\n]/g, '');
}

function wrap(value: string, width = WIDTH) {
  const text = ascii(value).trim();
  if (!text) return [];
  const lines: string[] = [];
  text.split('\n').forEach(part => {
    let line = '';
    part.split(/\s+/).forEach(word => {
      if (!line) { line = word.slice(0, width); return; }
      if (`${line} ${word}`.length <= width) line = `${line} ${word}`;
      else { lines.push(line); line = word.slice(0, width); }
    });
    if (line) lines.push(line);
  });
  return lines;
}

function columns(left: string, right: string) {
  const label = ascii(left);
  const value = ascii(right);
  if (label.length + value.length >= WIDTH) return `${label.slice(0, WIDTH - value.length - 1)} ${value}`;
  return `${label}${' '.repeat(WIDTH - label.length - value.length)}${value}`;
}

function whenLabel(when: Date) {
  const date = when.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  const time = when.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  return ascii(`${date} ${time}`);
}

function receiptLines(receipt: SaleReceipt) {
  const lines = ['DQ-Cafe', 'Artisan coffee & cakes', whenLabel(receipt.when), `#${receipt.orderNo}`, '-'.repeat(WIDTH)];
  receipt.items.forEach(item => {
    wrap(`${item.qty} ${item.name}`).forEach(line => lines.push(line));
    wrap(item.detail).forEach(line => lines.push(line));
    lines.push(columns(`${item.qty} x ${amount(item.unit)}`, amount(item.amount)));
  });
  lines.push('-'.repeat(WIDTH), columns('TOTAL', amount(receipt.total)));
  if (receipt.payment === 'Cash') lines.push(columns('Cash', amount(receipt.received)), columns('Change', amount(receipt.change)));
  else lines.push(columns(receipt.payment, amount(receipt.total)), columns('Received', amount(receipt.received)), columns('Change', amount(receipt.change)));
  lines.push('-'.repeat(WIDTH), 'Thank you!', 'Please come again');
  return lines;
}

function concat(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const bytes = new Uint8Array(length);
  let offset = 0;
  parts.forEach(part => { bytes.set(part, offset); offset += part.length; });
  return bytes;
}

function encodeReceipt(receipt: SaleReceipt) {
  const text = new TextEncoder();
  const line = (value: string) => text.encode(`${ascii(value)}\n`);
  const cmd = (...values: number[]) => new Uint8Array(values);
  const lines = receiptLines(receipt);
  const footerAt = lines.length - 2;
  const header = lines.slice(0, 4);
  const items = lines.slice(4, footerAt);
  const footer = lines.slice(footerAt);
  return concat([
    cmd(0x1b, 0x40),
    cmd(0x1b, 0x74, 0x00),
    cmd(0x1b, 0x4d, 0x00),
    cmd(0x1b, 0x61, 0x01),
    cmd(0x1b, 0x45, 0x01),
    cmd(0x1d, 0x21, 0x11),
    line(header[0] || 'DQ-Cafe'),
    cmd(0x1d, 0x21, 0x00),
    cmd(0x1b, 0x45, 0x00),
    ...header.slice(1).map(line),
    cmd(0x1b, 0x61, 0x00),
    ...items.map(line),
    cmd(0x1b, 0x61, 0x01),
    ...footer.map(line),
    cmd(0x1b, 0x64, 0x04),
    cmd(0x1d, 0x56, 0x00),
  ]);
}

export function receiptHtml(receipt: SaleReceipt) {
  const lines = receiptLines(receipt);
  const footerAt = lines.length - 2;
  const rows = lines.map((entry, index) => {
    if (entry === '-'.repeat(WIDTH)) return '<hr>';
    const role = index === 0 ? 'title' : index < 4 || index >= footerAt ? 'center' : '';
    return `<div${role ? ` class="${role}"` : ''}>${escapeHtml(entry) || '&nbsp;'}</div>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>DQ-Cafe receipt</title><style>
    @page { size: 58mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 58mm; background: #fff; color: #000; color-scheme: light; }
    body { font: 10px/1.25 'Courier New', ui-monospace, monospace; }
    .ticket { width: 58mm; padding: 2mm 2mm 4mm; }
    .title { font-size: 15px; font-weight: 700; text-align: center; line-height: 1.1; margin-bottom: 1mm; }
    .center { text-align: center; }
    hr { border: 0; border-top: 1px dashed #000; margin: 1.5mm 0; }
    div { white-space: pre; }
  </style></head><body><main class="ticket">${rows}</main></body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function warmUpPrinter() {
  const jobs: Promise<void>[] = [];
  const usb = usbApi();
  const serial = serialApi();
  if (usb) jobs.push(usb.getDevices().then(devices => { usbDevice = devices[0] ?? usbDevice; }).catch(() => undefined));
  if (serial) jobs.push(serial.getPorts().then(ports => { serialPort = ports[0] ?? serialPort; }).catch(() => undefined));
  return Promise.all(jobs);
}

async function printUsb(device: PrinterDevice, payload: Uint8Array) {
  if (!device.opened) await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  const config = device.configuration;
  if (!config) throw new Error('Printer has no configuration.');
  let output: { interfaceNumber: number; endpoint: number } | null = null;
  for (const face of config.interfaces) {
    for (const alt of face.alternates) {
      const endpoint = alt.endpoints.find(item => item.direction === 'out' && item.type === 'bulk');
      if (!endpoint) continue;
      output = { interfaceNumber: face.interfaceNumber, endpoint: endpoint.endpointNumber };
      break;
    }
    if (output) break;
  }
  if (!output) throw new Error('Printer has no output.');
  await device.claimInterface(output.interfaceNumber);
  try {
    for (let index = 0; index < payload.length; index += 512) {
      const result = await device.transferOut(output.endpoint, payload.subarray(index, index + 512));
      if (result.status !== 'ok') throw new Error('Printer rejected the receipt.');
    }
  } finally {
    try { await device.releaseInterface(output.interfaceNumber); } catch { /* the interface is already free */ }
  }
}

async function printSerial(port: PrinterPort, payload: Uint8Array) {
  if (!port.writable) await port.open({ baudRate: 9600 });
  const writer = port.writable?.getWriter();
  if (!writer) throw new Error('Printer is not writable.');
  try { await writer.write(payload); }
  finally { writer.releaseLock(); }
}

function printDialog(receipt: SaleReceipt) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;left:0;top:0;width:58mm;height:100vh;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) { iframe.remove(); return false; }
  doc.open();
  doc.write(receiptHtml(receipt));
  doc.close();
  win.onafterprint = () => iframe.remove();
  win.focus();
  win.print();
  return true;
}

export async function printSaleReceipt(receipt: SaleReceipt) {
  const payload = encodeReceipt(receipt);
  if (usbDevice) {
    try { await printUsb(usbDevice, payload); return true; }
    catch { usbDevice = null; }
  }
  if (serialPort) {
    try { await printSerial(serialPort, payload); return true; }
    catch { serialPort = null; }
  }
  try { return printDialog(receipt); }
  catch { return false; }
}
