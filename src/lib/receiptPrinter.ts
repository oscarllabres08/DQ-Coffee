export type ReceiptItem = { name: string; detail: string; qty: number; unit: number; amount: number };
export type ServiceType = 'Dine in' | 'Take out';

export type SaleReceipt = {
  orderNo: string;
  when: Date;
  serviceType: ServiceType;
  payment: string;
  items: ReceiptItem[];
  subtotal?: number;
  discountPercent?: number;
  discountAmount?: number;
  total: number;
  received: number;
  change: number;
};

const WIDTH = 32;
const STORE_ADDRESS = '14 Provincial Road San Ramon Dinalupihan Bataan, 2110';
const STORE_PHONE = '(0976) 310 8363';
const RECEIPT_HEADING = 'DQ Cafe';
const receiptDash = () => '-'.repeat(WIDTH);

type PrinterEndpoint = { direction: string; type: string; endpointNumber: number };
type PrinterInterface = { interfaceNumber: number; alternates: { endpoints: PrinterEndpoint[] }[] };
type PrinterConfiguration = { configurationValue: number; interfaces: PrinterInterface[] };
type PrinterDevice = {
  opened: boolean;
  vendorId?: number;
  productId?: number;
  productName?: string | null;
  manufacturerName?: string | null;
  configuration: PrinterConfiguration | null;
  configurations?: PrinterConfiguration[];
  open: () => Promise<void>;
  close?: () => Promise<void>;
  selectConfiguration: (value: number) => Promise<void>;
  claimInterface: (face: number) => Promise<void>;
  releaseInterface: (face: number) => Promise<void>;
  transferOut: (endpoint: number, data: BufferSource) => Promise<{ status: string }>;
  forget?: () => Promise<void>;
};
type PrinterWriter = { write: (data: Uint8Array) => Promise<void>; releaseLock: () => void };
type PrinterPort = { writable: { getWriter: () => PrinterWriter } | null; open: (options: { baudRate: number }) => Promise<void>; forget?: () => Promise<void> };
type UsbApi = { getDevices: () => Promise<PrinterDevice[]>; requestDevice: (options: { filters: { vendorId?: number }[] }) => Promise<PrinterDevice> };
type SerialApi = { getPorts: () => Promise<PrinterPort[]>; requestPort: () => Promise<PrinterPort> };

export type PrinterLink = { kind: 'usb' | 'serial'; name: string };
export type PrintOutcome = 'printed' | 'unavailable' | 'failed';

const PRINTER_KEY = 'dq-receipt-printer';
const PRINTER_USB_KEY = 'dq-receipt-printer-usb';
let usbDevice: PrinterDevice | null = null;
let serialPort: PrinterPort | null = null;
let lastPrintError = '';

function usbApi() {
  return (navigator as Navigator & { usb?: UsbApi }).usb;
}

function serialApi() {
  return (navigator as Navigator & { serial?: SerialApi }).serial;
}

export function printerSupport() {
  return { usb: Boolean(usbApi()?.requestDevice), serial: Boolean(serialApi()?.requestPort) };
}

function deviceName(device: PrinterDevice) {
  return device.productName || device.manufacturerName || 'USB receipt printer';
}

function remember(kind: 'usb' | 'serial') {
  localStorage.setItem(PRINTER_KEY, kind);
}

export function printerProblem() {
  return lastPrintError;
}

function connectError(error: unknown, kind: 'usb' | 'serial') {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotFoundError') return 'Nothing was chosen in the Chrome list. Tap Connect USB printer again, then select POS-58. Do not close the list without choosing it.';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Chrome blocked the printer. Allow the prompt, then try again.';
  if (kind === 'serial') return 'Could not open the serial printer. Plug it in and choose its COM port.';
  return 'Could not open the USB printer. Plug it in and choose it from the Chrome list.';
}

function sendError(error: unknown) {
  const name = error instanceof DOMException ? error.name : '';
  const message = error instanceof Error ? error.message : '';
  if (name === 'SecurityError' || name === 'AccessDeniedError' || /claim|access denied|security|busy|in use|unable to claim/i.test(message)) {
    return 'Windows is still using this printer. Open Windows Settings, then Printers, remove POS-58, unplug the USB cable for 5 seconds, plug it back in, then tap Forget printer here and connect again.';
  }
  if (name === 'NetworkError' || /not found|disconnect|network|device lost/i.test(message)) return 'The printer disconnected. Check power, paper, and the USB cable.';
  if (/configure|configuration|output|writable/i.test(message)) return message;
  return 'The receipt printer did not respond. Make sure it is on, has paper, and POS-58 is removed from Windows Printers.';
}

type PrinterUsbRef = { vendorId: number; productId: number };

function readUsbRef(): PrinterUsbRef | null {
  try {
    const raw = localStorage.getItem(PRINTER_USB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PrinterUsbRef;
    return typeof parsed.vendorId === 'number' && typeof parsed.productId === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

function rememberUsb(device: PrinterDevice) {
  if (device.vendorId == null || device.productId == null) return;
  localStorage.setItem(PRINTER_USB_KEY, JSON.stringify({ vendorId: device.vendorId, productId: device.productId }));
}

function usbOutput(config: PrinterConfiguration) {
  for (const face of config.interfaces) {
    for (const alt of face.alternates) {
      const endpoint = alt.endpoints.find(item => item.direction === 'out' && (item.type === 'bulk' || item.type === 'interrupt'));
      if (!endpoint) continue;
      return { interfaceNumber: face.interfaceNumber, endpoint: endpoint.endpointNumber };
    }
  }
  return null;
}

function deviceLooksLikePrinter(device: PrinterDevice) {
  const name = deviceName(device).toLowerCase();
  if (/pos|58|receipt|thermal|printer|xprinter|gprinter|rongta|epson tm|star/i.test(name)) return true;
  const config = device.configuration ?? device.configurations?.[0];
  return Boolean(config && usbOutput(config));
}

function pickUsbDevice(devices: PrinterDevice[]) {
  if (!devices.length) return null;
  const ref = readUsbRef();
  if (ref) {
    const matched = devices.find(device => device.vendorId === ref.vendorId && device.productId === ref.productId);
    if (matched) return matched;
  }
  return devices.find(device => deviceLooksLikePrinter(device)) ?? devices[0];
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

function itemLines(item: ReceiptItem) {
  const price = amount(item.amount);
  const nameWidth = Math.max(8, WIDTH - price.length - 1);
  const nameLines = wrap(`${item.qty} ${item.name}`, nameWidth);
  const lines = [columns(nameLines[0] || String(item.qty), price)];
  nameLines.slice(1).forEach(line => lines.push(line));
  wrap(item.detail, WIDTH - 2).forEach(line => lines.push(`  ${line}`));
  if (item.qty > 1) lines.push(`  ${item.qty} x ${amount(item.unit)}`);
  return lines;
}

function receiptLines(receipt: SaleReceipt) {
  const lines = ['Artisan coffee & cakes', ...wrap(STORE_ADDRESS, WIDTH), STORE_PHONE, whenLabel(receipt.when), `#${receipt.orderNo}`, receipt.serviceType, receiptDash()];
  receipt.items.forEach(item => lines.push(...itemLines(item)));
  lines.push(receiptDash());
  if (receipt.discountAmount && receipt.discountAmount > 0) {
    const subtotal = receipt.subtotal ?? receipt.total + receipt.discountAmount;
    lines.push(columns('Subtotal', amount(subtotal)));
    lines.push(columns(`Discount ${receipt.discountPercent ?? 0}%`, `-${amount(receipt.discountAmount)}`));
  }
  lines.push(columns('TOTAL', amount(receipt.total)));
  if (receipt.payment === 'Cash') lines.push(columns('Cash', amount(receipt.received)), columns('Change', amount(receipt.change)));
  else lines.push(columns(receipt.payment, amount(receipt.total)), columns('Received', amount(receipt.received)), columns('Change', amount(receipt.change)));
  lines.push(receiptDash(), 'Thank you!', 'Please come again');
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
  const dash = receiptDash();
  const footerAt = lines.length - 2;
  const bodyStart = lines.indexOf(dash);
  const header = lines.slice(0, bodyStart);
  const items = lines.slice(bodyStart, footerAt);
  const footer = lines.slice(footerAt);
  const head: Uint8Array[] = [
    cmd(0x1b, 0x40),
    cmd(0x1b, 0x74, 0x00),
    cmd(0x1b, 0x4d, 0x00),
    cmd(0x1b, 0x61, 0x01),
    cmd(0x1b, 0x45, 0x01),
    cmd(0x1d, 0x21, 0x11),
    line(RECEIPT_HEADING),
    cmd(0x1d, 0x21, 0x00),
    cmd(0x1b, 0x45, 0x00),
    cmd(0x1b, 0x64, 0x01),
  ];
  return concat([
    ...head,
    ...header.map(line),
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
  const dash = receiptDash();
  const footerAt = lines.length - 2;
  const bodyStart = lines.indexOf(dash);
  const rows = lines.map((entry, index) => {
    if (entry === dash) return '<hr>';
    const role = index < bodyStart || index >= footerAt ? 'center' : '';
    return `<div${role ? ` class="${role}"` : ''}>${escapeHtml(entry) || '&nbsp;'}</div>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>DQ-Cafe receipt</title><style>
    @page { size: 58mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 58mm; background: #fff; color: #000; color-scheme: light; }
    body { font: 10px/1.25 'Courier New', ui-monospace, monospace; }
    .ticket { width: 58mm; padding: 2mm 2mm 4mm; }
    .receipt-brand { text-align: center; font-size: 16px; font-weight: 700; letter-spacing: 0.02em; margin: 0 0 2mm; }
    .center { text-align: center; }
    hr { border: 0; border-top: 1px dashed #000; margin: 1.5mm 0; }
    div { white-space: pre; }
  </style></head><body><main class="ticket"><div class="receipt-brand">${escapeHtml(RECEIPT_HEADING)}</div>${rows}</main></body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function refreshPrinter(): Promise<PrinterLink | null> {
  const preferred = localStorage.getItem(PRINTER_KEY);
  const usb = usbApi();
  const serial = serialApi();
  const devices = usb ? await usb.getDevices().catch(() => [] as PrinterDevice[]) : [];
  const ports = serial ? await serial.getPorts().catch(() => [] as PrinterPort[]) : [];
  const useSerial = preferred === 'serial' ? ports[0] : !devices[0] ? ports[0] : undefined;
  if (useSerial) {
    serialPort = useSerial;
    usbDevice = null;
    return { kind: 'serial', name: 'Serial receipt printer' };
  }
  const picked = pickUsbDevice(devices);
  if (picked) {
    usbDevice = picked;
    serialPort = null;
    return { kind: 'usb', name: deviceName(picked) };
  }
  usbDevice = null;
  serialPort = null;
  return null;
}

export function warmUpPrinter() {
  return refreshPrinter().then(() => undefined);
}

export async function printerRemembered() {
  if (localStorage.getItem(PRINTER_KEY) || localStorage.getItem(PRINTER_USB_KEY)) return true;
  const usb = usbApi();
  const serial = serialApi();
  const devices = usb ? await usb.getDevices().catch(() => [] as PrinterDevice[]) : [];
  const ports = serial ? await serial.getPorts().catch(() => [] as PrinterPort[]) : [];
  return devices.length > 0 || ports.length > 0;
}

export async function ensurePrinter(kind: 'usb' | 'serial') {
  const linked = await refreshPrinter();
  if (linked?.kind === kind) return linked;
  return connectPrinter(kind);
}

export async function connectPrinter(kind: 'usb' | 'serial'): Promise<PrinterLink> {
  if (!window.isSecureContext) throw new Error('Open DQ-Cafe in Chrome to connect the receipt printer.');
  try {
    if (kind === 'usb') {
      const usb = usbApi();
      if (!usb?.requestDevice) throw new Error('This browser cannot connect a USB printer. Open DQ-Cafe in Chrome.');
      const device = await usb.requestDevice({ filters: [] });
      usbDevice = device;
      serialPort = null;
      remember('usb');
      rememberUsb(device);
      await probePrinter();
      return { kind: 'usb', name: deviceName(device) };
    }
    const serial = serialApi();
    if (!serial?.requestPort) throw new Error('This browser cannot connect a serial printer. Open DQ-Cafe in Chrome.');
    const port = await serial.requestPort();
    serialPort = port;
    usbDevice = null;
    remember('serial');
    await probePrinter();
    return { kind: 'serial', name: 'Serial receipt printer' };
  } catch (error) {
    if (error instanceof Error && !(error instanceof DOMException)) throw error;
    throw new Error(connectError(error, kind));
  }
}

export async function forgetPrinter() {
  const usb = usbApi();
  const serial = serialApi();
  const devices = usb ? await usb.getDevices().catch(() => [] as PrinterDevice[]) : [];
  const ports = serial ? await serial.getPorts().catch(() => [] as PrinterPort[]) : [];
  await Promise.all([...devices.map(device => device.forget?.() ?? Promise.resolve()), ...ports.map(port => port.forget?.() ?? Promise.resolve())]);
  usbDevice = null;
  serialPort = null;
  localStorage.removeItem(PRINTER_KEY);
  localStorage.removeItem(PRINTER_USB_KEY);
}

async function openUsb(device: PrinterDevice) {
  if (device.opened && device.close) {
    try { await device.close(); } catch { /* already closed */ }
  }
  await device.open();
  if (device.configuration !== null) return;
  const values = [...new Set([...(device.configurations?.map(entry => entry.configurationValue) ?? []), 1, 0])];
  let ready = false;
  for (const value of values) {
    try {
      await device.selectConfiguration(value);
      ready = true;
      break;
    } catch { /* try the next configuration */ }
  }
  if (!ready || !device.configuration) throw new Error('Could not configure the USB printer.');
}

export async function probePrinter() {
  if (!usbDevice && !serialPort) await refreshPrinter();
  try {
    if (usbDevice) {
      await openUsb(usbDevice);
      const output = usbDevice.configuration ? usbOutput(usbDevice.configuration) : null;
      if (!output) throw new Error('Printer has no USB output.');
      await usbDevice.claimInterface(output.interfaceNumber);
      try {
        const tick = new Uint8Array([0x1b, 0x40]);
        const result = await usbDevice.transferOut(output.endpoint, tick);
        if (result.status !== 'ok') throw new Error('Printer rejected the test.');
      } finally {
        try { await usbDevice.releaseInterface(output.interfaceNumber); } catch { /* already released */ }
      }
      return;
    }
    if (serialPort) {
      await printSerial(serialPort, new Uint8Array([0x1b, 0x40]));
      return;
    }
    throw new Error('Connect the receipt printer first.');
  } catch (error) {
  throw new Error(sendError(error));
  }
}

export function sampleReceipt(): SaleReceipt {
  return {
    orderNo: 'TEST',
    when: new Date(),
    serviceType: 'Dine in',
    payment: 'Cash',
    items: [{ name: 'Flat White', detail: 'Hot', qty: 1, unit: 150, amount: 150 }],
    total: 150,
    received: 200,
    change: 50,
  };
}

async function printUsb(device: PrinterDevice, payload: Uint8Array) {
  await openUsb(device);
  const config = device.configuration;
  if (!config) throw new Error('Printer has no configuration.');
  const output = usbOutput(config);
  if (!output) throw new Error('Printer has no USB output.');
  await device.claimInterface(output.interfaceNumber);
  try {
    for (let index = 0; index < payload.length; index += 64) {
      const result = await device.transferOut(output.endpoint, payload.subarray(index, index + 64));
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

export function printReceiptDialog(receipt: SaleReceipt) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;left:0;top:0;width:58mm;height:100vh;border:0;background:#fff;z-index:2147483000;';
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

export async function printSaleReceipt(receipt: SaleReceipt): Promise<PrintOutcome> {
  lastPrintError = '';
  if (!usbDevice && !serialPort) await refreshPrinter();
  const payload = encodeReceipt(receipt);
  try {
    if (usbDevice) { await printUsb(usbDevice, payload); return 'printed'; }
    if (serialPort) { await printSerial(serialPort, payload); return 'printed'; }
    return 'unavailable';
  } catch (error) {
    lastPrintError = sendError(error);
    return 'failed';
  }
}
