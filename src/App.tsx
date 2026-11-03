import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { printSaleReceipt, warmUpPrinter } from '@/lib/receiptPrinter';
import { ensureMenu } from '@/data/menuSeed';
import { Banknote, BarChart3, Box, Calendar, Car, ChevronDown, Coffee, CreditCard, Download, Droplets, Eye, EyeOff, Home, ImagePlus, LayoutDashboard, Lock, LogOut, Menu, Moon, Package, Pencil, Plus, Receipt, Search, Settings, ShoppingBag, Smartphone, Sun, Tag, Trash2, TrendingUp, Trophy, UserRound, Users, Wifi, Wrench, X, Zap, ChevronRight } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

type MenuGroup = 'Food' | 'Beverages';
type Subcategory = 'Coffee' | 'Non Coffee' | 'Matcha Series' | 'Frappe' | 'Sparkling Series' | 'Tea Infusion' | 'Specialty hot coffee' | 'Breakfast' | 'Pasta' | 'Snacks' | 'Waffles' | 'Korean Dish' | 'Fries';
type Temperature = 'Hot' | 'Iced' | 'None';
type Size = '16 oz' | '22 oz' | 'Regular' | '6 pcs' | '12 pcs';
type Page = 'dashboard' | 'pos' | 'inventory' | 'sales' | 'expenses' | 'settings';
type ExpenseCategory = 'Rent' | 'Electricity' | 'Water Bill' | 'Internet' | 'Salaries / Wages' | 'Transportation' | 'Maintenance' | 'Supplies' | 'Miscellaneous';
type Product = { id: string; name: string; description: string | null; category: MenuGroup; subcategory: Subcategory; temperature: Temperature; size: Size; image_url: string | null; price: number; quantity: number; created_at: string };
type Addon = { id: string; name: string; price: number };
type CartItem = Product & { lineId: string; cartQuantity: number; sweetness: string; addons: Addon[] };
type Sale = { id: string; subtotal: number; tax: number; total: number; payment_method: string; created_at: string };
type SaleItem = { product_id: string | null; product_name: string; quantity: number; line_total: number };
type Expense = { id: string; category: ExpenseCategory; label: string; amount: number; notes: string | null; spent_on: string; created_at: string };

const logo = '/icon.png';
const THEME_KEY = 'dq-theme';
const pages: Page[] = ['dashboard', 'pos', 'inventory', 'sales', 'expenses', 'settings'];
const pageFromLocation = (): Page => {
  const name = new URLSearchParams(window.location.search).get('page');
  return name && pages.includes(name as Page) ? name as Page : 'dashboard';
};
const writePage = (page: Page, mode: 'push' | 'replace') => {
  const url = new URL(window.location.href);
  if (page === 'dashboard') url.searchParams.delete('page');
  else url.searchParams.set('page', page);
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  if (mode === 'push') window.history.pushState(null, '', next);
  else window.history.replaceState(null, '', next);
};
const applyTheme = (dark: boolean) => {
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
};
const money = (value: number) => `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const formatDay = (key: string) => { const [year, month, day] = key.split('-').map(Number); return new Date(year, (month || 1) - 1, day || 1).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }); };
const expenseCategories: ExpenseCategory[] = ['Rent', 'Electricity', 'Water Bill', 'Internet', 'Salaries / Wages', 'Transportation', 'Maintenance', 'Supplies', 'Miscellaneous'];
function expenseTotal(items: Expense[]) { return items.reduce((sum, item) => sum + Number(item.amount), 0); }
function expenseIcon(category: string, size = 16) {
  if (category === 'Rent') return <Home size={size} />;
  if (category === 'Electricity') return <Zap size={size} />;
  if (category === 'Water Bill') return <Droplets size={size} />;
  if (category === 'Internet') return <Wifi size={size} />;
  if (category === 'Salaries / Wages') return <Users size={size} />;
  if (category === 'Transportation') return <Car size={size} />;
  if (category === 'Maintenance') return <Wrench size={size} />;
  if (category === 'Supplies') return <Package size={size} />;
  return <Tag size={size} />;
}
function expenseTone(category: string) {
  if (category === 'Rent') return 'rent';
  if (category === 'Electricity') return 'electricity';
  if (category === 'Water Bill') return 'water';
  if (category === 'Internet') return 'internet';
  if (category === 'Salaries / Wages') return 'wages';
  if (category === 'Transportation') return 'transport';
  if (category === 'Maintenance') return 'maintenance';
  if (category === 'Supplies') return 'supplies';
  return 'misc';
}
const menuGroups: MenuGroup[] = ['Beverages', 'Food'];
const drinkSubs: Subcategory[] = ['Coffee', 'Non Coffee', 'Matcha Series', 'Frappe', 'Sparkling Series', 'Tea Infusion', 'Specialty hot coffee'];
const foodSubs: Subcategory[] = ['Breakfast', 'Pasta', 'Snacks', 'Waffles', 'Korean Dish', 'Fries'];
const subcategories: Record<MenuGroup, Subcategory[]> = { Beverages: drinkSubs, Food: foodSubs };
const frappeSizes: Size[] = ['16 oz', '22 oz'];
const snackSizes: Size[] = ['Regular', '6 pcs', '12 pcs'];
const temperatureOptions: Record<Subcategory, Temperature[]> = {
  Coffee: ['Hot', 'Iced'],
  'Non Coffee': ['Iced'],
  'Matcha Series': ['Hot', 'Iced'],
  Frappe: ['Iced'],
  'Sparkling Series': ['Iced'],
  'Tea Infusion': ['Iced'],
  'Specialty hot coffee': ['Hot'],
  Breakfast: ['None'],
  Pasta: ['None'],
  Snacks: ['None'],
  Waffles: ['None'],
  'Korean Dish': ['None'],
  Fries: ['None'],
};
const hasSize = (product: Pick<Product, 'category' | 'subcategory' | 'size'>) => product.subcategory === 'Frappe' || (product.category === 'Food' && product.size !== 'Regular');
const productMeta = (product: Pick<Product, 'subcategory' | 'temperature' | 'size' | 'category'>) => [product.subcategory, product.temperature !== 'None' ? product.temperature : '', hasSize(product) ? product.size : ''].filter(Boolean).join(' · ');
const variantLabel = (product: Pick<Product, 'category' | 'subcategory' | 'temperature' | 'size'>) => product.category === 'Food' ? (product.size !== 'Regular' ? product.size : product.subcategory) : product.subcategory === 'Frappe' ? `${product.temperature} · ${product.size}` : product.temperature;
const menuAddons: Addon[] = [
  { id: 'syrup', name: 'Syrup', price: 20 },
  { id: 'sauce', name: 'Sauce', price: 30 },
  { id: 'sinker', name: 'Sinker', price: 30 },
  { id: 'milk', name: 'Milk option', price: 40 },
];
const sweetnessLevels = ['0%', '25%', '50%', '75%', '100%'];
const lineUnit = (item: Pick<CartItem, 'price' | 'addons'>) => Number(item.price) + item.addons.reduce((sum, addon) => sum + addon.price, 0);
const allowsExtras = (product: Pick<Product, 'temperature'>) => product.temperature === 'Iced';
const orderDetail = (item: Pick<CartItem, 'category' | 'subcategory' | 'temperature' | 'size' | 'sweetness' | 'addons'>) => allowsExtras(item) ? [variantLabel(item), item.sweetness, item.addons.length ? item.addons.map(addon => addon.name).join(', ') : 'No add ons'].join(' · ') : variantLabel(item);
const splitByTemperature = (subcategory: Subcategory) => temperatureOptions[subcategory].length > 1;
const groupName = (subcategory: Subcategory, temperature?: Temperature) => splitByTemperature(subcategory) && temperature && temperature !== 'None' ? `${temperature} ${subcategory}` : subcategory;
const inImageGroup = (product: Pick<Product, 'subcategory' | 'temperature'>, subcategory: Subcategory, temperature?: Temperature) => product.subcategory === subcategory && (!splitByTemperature(subcategory) || product.temperature === temperature);
const normalizeProduct = (product: Product): Product => {
  if (product.category === 'Food' || product.category === 'Beverages') return product;
  const legacy = product.category as string;
  if ((drinkSubs as string[]).includes(legacy)) return { ...product, subcategory: legacy as Subcategory, category: 'Beverages' };
  if ((foodSubs as string[]).includes(legacy)) return { ...product, subcategory: legacy as Subcategory, category: 'Food', temperature: product.temperature || 'None' };
  return { ...product, subcategory: product.subcategory || 'Coffee', category: 'Beverages' };
};
async function uploadProductImage(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('Choose a photo file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Photo must be 5 MB or smaller.');
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Sign in again to upload a photo.');
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type || 'image/jpeg' });
  if (error) throw new Error(error.message);
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}
function ProductMark({ product, size = 16 }: { product: Pick<Product, 'image_url' | 'name'>; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (product.image_url && !failed) return <img src={product.image_url} alt={product.name} referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
  return <Coffee size={size} />;
}

function CategoryMenu({ value, options, onChange, icons }: { value: string; options: readonly string[]; onChange: (value: string) => void; icons?: Record<string, ReactNode> }) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const placeMenu = () => {
    const trigger = ref.current?.querySelector('button');
    if (!trigger) return;
    const box = trigger.getBoundingClientRect();
    const listHeight = Math.min(320, options.length * 48 + 16);
    const top = window.innerHeight - box.bottom < listHeight + 12 ? Math.max(8, box.top - listHeight - 8) : box.bottom + 8;
    setPlace({ top, left: box.left, width: box.width });
  };
  useEffect(() => {
    if (!open) return;
    placeMenu();
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    };
    const reposition = () => placeMenu();
    document.addEventListener('mousedown', close);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true); };
  }, [open, options.length]);
  return <div className={open ? 'menu-select open' : 'menu-select'} ref={ref}>
    <button type="button" className="menu-select-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => { if (open) { setOpen(false); return; } placeMenu(); setOpen(true); }}><span className="menu-select-label">{icons?.[value]}{value}</span><ChevronDown size={18} /></button>
    {open && createPortal(<ul className="menu-select-list" role="listbox" ref={listRef} style={{ top: place.top, left: place.left, width: place.width }}>{options.map(option => <li key={option}><button type="button" role="option" aria-selected={option === value} className={option === value ? 'active' : ''} onClick={() => { onChange(option); setOpen(false); }}>{icons?.[option]}{option}</button></li>)}</ul>, document.body)}
  </div>;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setAuthLoading(false); });
    return () => data.subscription.unsubscribe();
  }, []);
  useLayoutEffect(() => {
    if (authLoading) return;
    const dark = localStorage.getItem(THEME_KEY) === 'dark';
    document.documentElement.classList.toggle('dark', Boolean(session) && dark);
  }, [authLoading, session]);

  if (authLoading) return <div className="auth-loading"><Coffee size={30} /><span>Preparing your coffee bar...</span></div>;
  return session ? <AdminApp session={session} /> : <AuthScreen />;
}

function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage('');
    if (mode === 'register' && form.password !== form.confirm) { setMessage('Passwords do not match.'); return; }
    setBusy(true);
    const result = mode === 'login' ? await supabase.auth.signInWithPassword({ email: form.email, password: form.password }) : await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.fullName } } });
    if (result.error) setMessage(result.error.message);
    else if (mode === 'register' && !result.data.session) setMessage('Account created. You can now sign in.');
    setBusy(false);
  };
  return <main className="auth-shell">
    <section className="auth-brand"><div className="brand-mark"><img src={logo} alt="DQ-Cafe" /></div><p className="eyebrow">ARTISAN COFFEE & CAKES</p><h1>Good coffee.<br /><em>Better days.</em></h1><p className="brand-copy">A calm, simple command center for your daily coffee shop operations.</p><ul className="brand-tags" aria-label="House favorites"><li>Coffee</li><li>Latte</li><li>Iced</li></ul></section>
    <section className="auth-card"><div className="auth-card-head"><span className="mini-logo"><img src={logo} alt="" /></span><span>DQ-Cafe Manager</span></div><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign in</button><button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create account</button></div><h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2><p className="muted">{mode === 'login' ? 'Sign in to manage your cafe.' : 'For owners and admins only.'}</p><form onSubmit={submit}>
      {mode === 'register' && <label>Full name<input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Juan Dela Cruz" /></label>}
      <label>Email address<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@dq-cafe.com" /></label>
      <label>Password<span className="input-wrap"><input required minLength={6} type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
      {mode === 'register' && <label>Confirm password<span className="input-wrap"><input required minLength={6} type={showConfirm ? 'text' : 'password'} value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} placeholder="••••••••" /><button type="button" onClick={() => setShowConfirm(!showConfirm)} aria-label="Toggle confirm password visibility">{showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>}
      {message && <div className="form-message">{message}</div>}<button className="primary-btn full" disabled={busy}>{busy ? 'Please wait...' : mode === 'login' ? 'Sign in to dashboard' : 'Create owner account'} <ChevronRight size={17} /></button>
    </form><p className="auth-foot">By continuing, you agree to keep your shop data secure.</p></section>
  </main>;
}

function AdminApp({ session }: { session: Session }) {
  const [page, setPage] = useState<Page>(pageFromLocation);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(() => pageFromLocation() === 'settings');
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) === 'dark');
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const loadData = async () => {
    await ensureMenu();
    const [{ data: productData }, { data: saleData }, { data: itemData }, { data: expenseData }] = await Promise.all([supabase.from('products').select('*').order('created_at', { ascending: false }), supabase.from('sales').select('*').order('created_at', { ascending: false }), supabase.from('sale_items').select('product_id, product_name, quantity, line_total'), supabase.from('expenses').select('*').order('spent_on', { ascending: false }).order('created_at', { ascending: false })]);
    setProducts(((productData as Product[]) ?? []).map(normalizeProduct)); setSales((saleData as Sale[]) ?? []); setSaleItems((itemData as SaleItem[]) ?? []); setExpenses((expenseData as Expense[]) ?? []);
  };
  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (settingsOpen) settingsMenuRef.current?.scrollIntoView({ block: 'nearest' }); }, [settingsOpen]);
  useEffect(() => { document.body.classList.toggle('nav-lock', mobileOpen); return () => document.body.classList.remove('nav-lock'); }, [mobileOpen]);
  useEffect(() => {
    writePage(page, 'replace');
    const onPop = () => { const next = pageFromLocation(); setPage(next); if (next === 'settings') setSettingsOpen(true); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [page]);
  const userName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Owner';
  const navigate = (next: Page) => { setPage(next); writePage(next, 'push'); setMobileOpen(false); if (next !== 'settings') setSettingsOpen(false); else setSettingsOpen(true); };
  const toggleDark = () => { const next = !dark; applyTheme(next); setDark(next); };
  return <div className="app-shell">{mobileOpen && <button type="button" className="sidebar-backdrop" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}<aside className={mobileOpen ? 'sidebar open' : 'sidebar'}><div className="sidebar-brand"><img src={logo} alt="DQ-Cafe" /><div><strong>DQ-Cafe</strong><small>Admin workspace</small></div></div><nav><NavButton icon={<LayoutDashboard size={18} />} label="Overview" active={page === 'dashboard'} onClick={() => navigate('dashboard')} /><NavButton icon={<ShoppingBag size={18} />} label="Point of Sale" active={page === 'pos'} onClick={() => navigate('pos')} /><NavButton icon={<Box size={18} />} label="Inventory" active={page === 'inventory'} onClick={() => navigate('inventory')} /><NavButton icon={<BarChart3 size={18} />} label="Sales & Analytics" active={page === 'sales'} onClick={() => navigate('sales')} /><NavButton icon={<Receipt size={18} />} label="Expenses" active={page === 'expenses'} onClick={() => navigate('expenses')} /><div className="nav-group"><button className={settingsOpen || page === 'settings' ? 'nav-button active' : 'nav-button'} aria-expanded={settingsOpen} onClick={() => setSettingsOpen(open => !open)}><Settings size={18} /><span>Settings</span><ChevronDown size={16} className={settingsOpen ? 'nav-chevron open' : 'nav-chevron'} /></button><div className={settingsOpen ? 'nav-submenu-wrap open' : 'nav-submenu-wrap'}><div className="nav-submenu" ref={settingsMenuRef}><button className={page === 'settings' ? 'nav-sub active' : 'nav-sub'} onClick={() => navigate('settings')}><UserRound size={16} /><span>Account settings</span></button><button type="button" className="nav-sub" role="switch" aria-checked={dark} onClick={toggleDark}>{dark ? <Moon size={16} /> : <Sun size={16} />}<span>Dark mode</span><span className={dark ? 'switch nav-switch on' : 'switch nav-switch'} aria-hidden="true"><span /></span></button></div></div></div></nav><div className="sidebar-bottom"><button className="nav-button" onClick={() => supabase.auth.signOut()}><LogOut size={18} /> <span>Sign out</span></button></div></aside><div className="main-shell"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}><Menu size={20} /></button><div className="topbar-title"><span className="eyebrow">DQ-CAFE / {page === 'dashboard' ? 'TODAY AT A GLANCE' : page === 'settings' ? 'ACCOUNT' : page === 'expenses' ? 'EXPENSES' : page.replace('-', ' ').toUpperCase()}</span><h1>{page === 'dashboard' ? 'Good morning, ' + userName.split(' ')[0] + '.' : page === 'pos' ? 'Point of Sale' : page === 'inventory' ? 'Inventory' : page === 'sales' ? 'Sales & Analytics' : page === 'expenses' ? 'Expenses' : 'Account settings'}</h1></div><div className="topbar-user"><span className="avatar">{userName[0].toUpperCase()}</span><span>{userName}</span><span className="status-dot" /></div></header><main className="content page-enter" key={page}>{page === 'dashboard' && <Dashboard products={products} sales={sales} saleItems={saleItems} expenses={expenses} navigate={navigate} />}{page === 'pos' && <POS products={products} cart={cart} setCart={setCart} onSale={loadData} />}{page === 'inventory' && <Inventory products={products} setProducts={setProducts} />}{page === 'sales' && <SalesAnalytics sales={sales} expenses={expenses} />}{page === 'expenses' && <ExpensesPage expenses={expenses} setExpenses={setExpenses} />}{page === 'settings' && <SettingsPage session={session} />}</main></div></div>;
}

function NavButton({ icon, label, active, onClick }: { icon: ReactNode; label: string; active: boolean; onClick: () => void }) { return <button className={active ? 'nav-button active' : 'nav-button'} onClick={onClick}>{icon}<span>{label}</span></button>; }
function StatCard({ icon, label, value, note, tone = 'gold', kind }: { icon: ReactNode; label: string; value: string; note: string; tone?: string; kind?: 'net' | 'loss' }) { return <div className={kind === 'loss' ? 'stat-card net loss' : kind === 'net' ? 'stat-card net' : 'stat-card'}><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>; }

function rankSellers(items: SaleItem[], products: Product[]) {
  const totals = new Map<string, { productId: string | null; name: string; quantity: number; revenue: number }>();
  for (const item of items) {
    const key = item.product_id || item.product_name;
    const row = totals.get(key) ?? { productId: item.product_id, name: item.product_name, quantity: 0, revenue: 0 };
    row.quantity += Number(item.quantity) || 0;
    row.revenue += Number(item.line_total) || 0;
    totals.set(key, row);
  }
  return [...totals.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, 5).map(row => {
    const product = row.productId ? products.find(entry => entry.id === row.productId) : undefined;
    return { ...row, name: product?.name ?? row.name.replace(/\s+\([^)]*\)$/, ''), product, meta: product ? productMeta(product) : row.name };
  });
}

function ExpenseRow({ expense, onRemove, showDate = true }: { expense: Expense; onRemove?: (id: string) => void; showDate?: boolean }) {
  const detail = [showDate ? formatDay(expense.spent_on) : '', expense.notes].filter(Boolean).join(' · ');
  return <div className="expense-row"><span className={`expense-mark ${expenseTone(expense.category)}`}>{expenseIcon(expense.category)}</span><span className="mini-copy"><strong>{expense.label}</strong>{detail && <small>{detail}</small>}</span><b>{money(Number(expense.amount))}</b>{onRemove && <button className="delete-btn" type="button" aria-label={`Remove ${expense.label}`} onClick={() => onRemove(expense.id)}><Trash2 size={16} /></button>}</div>;
}

function Dashboard({ products, sales, saleItems, expenses, navigate }: { products: Product[]; sales: Sale[]; saleItems: SaleItem[]; expenses: Expense[]; navigate: (page: Page) => void }) {
  const todayStamp = new Date().toDateString();
  const todaySales = sales.filter(sale => new Date(sale.created_at).toDateString() === todayStamp);
  const todayExpenses = expenses.filter(item => item.spent_on === localDateKey()).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const gross = todaySales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const spent = expenseTotal(todayExpenses);
  const net = gross - spent;
  const lowStock = products.filter(product => product.quantity <= 5).length;
  const sellers = rankSellers(saleItems, products); const [top, ...rest] = sellers;
  return <div className="page-stack"><section className="hero-card"><div><span className="eyebrow light">YOUR DAILY BRIEF</span><h2>Make today<br /><em>worth sipping.</em></h2><p>Keep the bar flowing, the shelves ready, and every order feeling personal.</p><button className="light-btn" onClick={() => navigate('pos')}>Open POS <ChevronRight size={16} /></button></div><div className="hero-orb"><Coffee size={32} /></div></section><div className="stats-grid"><StatCard icon={<CreditCard size={19} />} label="Gross income" value={money(gross)} note="Today's sales" /><StatCard icon={<Receipt size={19} />} label="Expenses" value={money(spent)} note="Recorded today" tone="gold" /><StatCard icon={<TrendingUp size={19} />} label="Net income" value={money(net)} note="After today's expenses" tone={net < 0 ? 'red' : 'green'} kind={net < 0 ? 'loss' : 'net'} /><StatCard icon={<ShoppingBag size={19} />} label="Orders today" value={String(todaySales.length)} note="Completed sales" tone="brown" /></div>{lowStock > 0 && <button type="button" className="attention-bar" onClick={() => navigate('inventory')}><span>{lowStock} menu {lowStock === 1 ? 'item needs' : 'items need'} restock</span><ChevronRight size={16} /></button>}<section className="panel today-expenses"><div className="section-heading"><div><span className="eyebrow">TODAY</span><h3>Expenses</h3></div><button type="button" className="text-btn" onClick={() => navigate('expenses')}>Open expenses</button></div>{todayExpenses.length === 0 ? <p className="muted today-empty">No expenses recorded today.</p> : <div className="expense-list">{todayExpenses.map(item => <ExpenseRow key={item.id} expense={item} showDate={false} />)}</div>}</section><div className="dashboard-grid"><section className="panel quick-panel"><div className="section-heading"><div><span className="eyebrow">QUICK ACTIONS</span><h3>Keep things moving</h3></div></div><div className="quick-actions"><button onClick={() => navigate('pos')}><span className="quick-icon brown"><ShoppingBag size={20} /></span><span><strong>New order</strong><small>Serve a customer</small></span><ChevronRight size={17} /></button><button onClick={() => navigate('inventory')}><span className="quick-icon gold"><Plus size={20} /></span><span><strong>Add a product</strong><small>Update your menu</small></span><ChevronRight size={17} /></button><button onClick={() => navigate('sales')}><span className="quick-icon green"><BarChart3 size={20} /></span><span><strong>View performance</strong><small>Read your numbers</small></span><ChevronRight size={17} /></button><button onClick={() => navigate('expenses')}><span className="quick-icon gold"><Receipt size={20} /></span><span><strong>Log an expense</strong><small>Bills and other costs</small></span><ChevronRight size={17} /></button></div></section><section className="panel"><div className="section-heading"><div><span className="eyebrow">BEST SELLER</span><h3>Most ordered</h3></div></div>{!top ? <EmptyState text="Complete a sale to see your most ordered product." /> : <><div className="best-seller"><span className="product-thumb">{top.product ? <ProductMark product={top.product} size={22} /> : <Coffee size={22} />}</span><span><span className="best-rank"><Trophy size={13} /> Best seller</span><strong>{top.name}</strong><small>{top.meta}</small></span><b>{top.quantity} sold</b></div>{rest.length > 0 && <div className="seller-list">{rest.map((item, index) => <div className="seller-row" key={item.productId || item.name}><span className="seller-rank">{index + 2}</span><span className="product-thumb">{item.product ? <ProductMark product={item.product} size={17} /> : <Coffee size={17} />}</span><span className="mini-copy"><strong>{item.name}</strong><small>{item.meta}</small></span><b>{item.quantity} sold</b></div>)}</div>}</>}</section></div></div>;
}

function AddonPicker({ product, sweetness, wantAddons, picked, onSweetness, onWant, onToggle, onClose, onConfirm }: { product: Product; sweetness: string; wantAddons: boolean; picked: string[]; onSweetness: (value: string) => void; onWant: (value: boolean) => void; onToggle: (id: string) => void; onClose: () => void; onConfirm: () => void }) {
  const extras = wantAddons ? menuAddons.filter(addon => picked.includes(addon.id)) : [];
  const unit = Number(product.price) + extras.reduce((sum, addon) => sum + addon.price, 0);
  const ready = !wantAddons || extras.length > 0;
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className="modal addon-modal" role="dialog" aria-modal="true" aria-labelledby="addon-title"><div className="modal-head"><div><span className="eyebrow">ADD TO ORDER</span><h2 id="addon-title">{product.name}</h2><p className="muted">{productMeta(product)} · {money(Number(product.price))}</p></div><button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button></div><div className="addon-sheet"><div className="addon-field"><span>Sweetness level</span><div className="choice-row sweetness-row">{sweetnessLevels.map(level => <button type="button" key={level} className={sweetness === level ? 'active' : ''} onClick={() => onSweetness(level)}>{level}</button>)}</div></div><div className="addon-field"><span>Add ons</span><div className="choice-row"><button type="button" className={wantAddons ? '' : 'active'} onClick={() => onWant(false)}>No add ons</button><button type="button" className={wantAddons ? 'active' : ''} onClick={() => onWant(true)}>Add ons</button></div></div>{wantAddons && <div className="addon-list">{menuAddons.map(addon => <button type="button" key={addon.id} className={picked.includes(addon.id) ? 'addon-option active' : 'addon-option'} onClick={() => onToggle(addon.id)}><span>{addon.name}</span><b>+{money(addon.price)}</b></button>)}</div>}<div className="addon-total"><span>Item total</span><strong>{money(unit)}</strong></div><button className="primary-btn full" type="button" disabled={!ready} onClick={onConfirm}>{ready ? 'Add to order' : 'Choose an add on'} <ChevronRight size={16} /></button></div></div></div>;
}
function POS({ products, cart, setCart, onSale }: { products: Product[]; cart: CartItem[]; setCart: (items: CartItem[]) => void; onSale: () => Promise<void> }) {
  const [group, setGroup] = useState<MenuGroup>('Beverages'); const [subcategory, setSubcategory] = useState<'All' | Subcategory>('All'); const [search, setSearch] = useState(''); const [payment, setPayment] = useState('Cash'); const [cashReceived, setCashReceived] = useState(''); const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<Product | null>(null); const [sweetness, setSweetness] = useState('0%'); const [wantAddons, setWantAddons] = useState(false); const [pickedAddons, setPickedAddons] = useState<string[]>([]); const [cartOpen, setCartOpen] = useState(false);
  useEffect(() => { document.body.classList.toggle('sheet-lock', cartOpen); return () => document.body.classList.remove('sheet-lock'); }, [cartOpen]);
  useEffect(() => { warmUpPrinter(); }, []);
  const visible = products.filter(p => p.category === group && (subcategory === 'All' || p.subcategory === subcategory) && p.name.toLowerCase().includes(search.toLowerCase())); const subtotal = cart.reduce((sum, item) => sum + lineUnit(item) * item.cartQuantity, 0); const total = subtotal; const paymentOptions = ['Cash', 'GCash', 'Card'] as const; const paymentIcons: Record<string, ReactNode> = { Cash: <Banknote size={16} />, GCash: <Smartphone size={16} />, Card: <CreditCard size={16} /> };
  const reserved = (productId: string) => cart.filter(item => item.id === productId).reduce((sum, item) => sum + item.cartQuantity, 0);
  const openPicker = (product: Product) => { if (product.quantity === 0) return; if (reserved(product.id) >= product.quantity) { setMessage('That item is already fully in the order.'); return; } setMessage(''); if (!allowsExtras(product)) { const lineId = product.id; const exists = cart.find(item => item.lineId === lineId); setCart(exists ? cart.map(item => item.lineId === lineId ? { ...item, cartQuantity: item.cartQuantity + 1 } : item) : [...cart, { ...product, lineId, cartQuantity: 1, sweetness: '', addons: [] }]); return; } setPicker(product); setSweetness('0%'); setWantAddons(false); setPickedAddons([]); };
  const toggleAddon = (id: string) => setPickedAddons(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const confirmAdd = () => { if (!picker || !allowsExtras(picker) || (wantAddons && !pickedAddons.length) || reserved(picker.id) >= picker.quantity) return; const extras = wantAddons ? menuAddons.filter(addon => pickedAddons.includes(addon.id)) : []; const lineId = `${picker.id}|${sweetness}|${extras.map(addon => addon.id).sort().join('+')}`; const exists = cart.find(item => item.lineId === lineId); setCart(exists ? cart.map(item => item.lineId === lineId ? { ...item, cartQuantity: item.cartQuantity + 1 } : item) : [...cart, { ...picker, lineId, cartQuantity: 1, sweetness, addons: extras }]); setPicker(null); };
  const updateQty = (lineId: string, delta: number) => { const target = cart.find(item => item.lineId === lineId); if (!target || (delta > 0 && reserved(target.id) >= target.quantity)) return; setCart(cart.map(item => item.lineId === lineId ? { ...item, cartQuantity: item.cartQuantity + delta } : item).filter(item => item.cartQuantity > 0)); };
  const receivedCents = Math.round((Number(cashReceived) || 0) * 100); const totalCents = Math.round(total * 100); const change = (receivedCents - totalCents) / 100; const cashReady = cashReceived !== '' && receivedCents >= totalCents;
  const checkout = async () => {
    if (!cart.length || !cashReady || saving) return;
    const receiptItems = cart.map(item => ({ name: item.name, detail: orderDetail(item), qty: item.cartQuantity, unit: lineUnit(item), amount: lineUnit(item) * item.cartQuantity }));
    const salePayment = payment;
    const saleTotal = total;
    const saleReceived = Number(cashReceived) || 0;
    const saleChange = change;
    setSaving(true);
    setMessage('');
    const started = Date.now();
    try {
      const { data: sale, error } = await supabase.from('sales').insert({ subtotal, tax: 0, total: saleTotal, payment_method: salePayment }).select().maybeSingle();
      if (error || !sale) { setMessage(error?.message || 'Unable to complete sale.'); return; }
      const { error: itemsError } = await supabase.from('sale_items').insert(cart.map(item => ({ sale_id: sale.id, product_id: item.id, product_name: `${item.name} (${orderDetail(item)})`, quantity: item.cartQuantity, unit_price: lineUnit(item), line_total: lineUnit(item) * item.cartQuantity })));
      if (itemsError) { setMessage(itemsError.message); return; }
      const stock = new Map<string, { quantity: number; sold: number }>();
      cart.forEach(item => { const row = stock.get(item.id) ?? { quantity: item.quantity, sold: 0 }; row.sold += item.cartQuantity; stock.set(item.id, row); });
      await Promise.all([...stock].map(([id, row]) => supabase.from('products').update({ quantity: Math.max(0, row.quantity - row.sold) }).eq('id', id)));
      const printed = await printSaleReceipt({ orderNo: String(sale.id).replace(/-/g, '').slice(0, 8).toUpperCase(), when: new Date(sale.created_at), payment: salePayment, items: receiptItems, total: saleTotal, received: saleReceived, change: saleChange });
      setCart([]);
      setCashReceived('');
      await onSale();
      setMessage(printed ? 'Sale completed successfully.' : 'Sale saved, but the receipt did not print.');
    } finally {
      const wait = 600 - (Date.now() - started);
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
      setSaving(false);
    }
  };
  return <div className="pos-layout"><section className="pos-menu"><div className="toolbar pos-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu..." /></div><div className="menu-groups">{menuGroups.map(item => <button type="button" className={group === item ? `active ${item === 'Food' ? 'food' : ''}` : ''} key={item} onClick={() => { setGroup(item); setSubcategory('All'); }}>{item}</button>)}</div><div className="category-pills"><button className={subcategory === 'All' ? 'active' : ''} onClick={() => setSubcategory('All')}>All</button>{subcategories[group].map(item => <button className={subcategory === item ? 'active' : ''} key={item} onClick={() => setSubcategory(item)}>{item}</button>)}</div></div>{visible.length === 0 ? <div className="panel"><EmptyState text="No products found. Add one from Inventory." /></div> : <div className="product-grid">{visible.map(product => <div role="button" tabIndex={product.quantity === 0 ? -1 : 0} aria-disabled={product.quantity === 0} className="product-card" key={product.id} onClick={() => { if (product.quantity > 0) openPicker(product); }} onKeyDown={event => { if (event.key !== 'Enter' && event.key !== ' ') return; event.preventDefault(); if (product.quantity > 0) openPicker(product); }}><div className="product-art">{product.temperature !== 'None' && <span className={`temp-tag ${product.temperature === 'Hot' ? 'hot' : 'iced'}`}>{product.temperature}</span>}<ProductMark product={product} size={31} /></div><div className="product-info"><strong>{product.name}</strong><small>{productMeta(product)}</small><div className="product-row"><b>{money(Number(product.price))}</b><span className="add-chip">{product.quantity === 0 ? 'Sold out' : 'Add'}</span></div></div></div>)}</div>}</section><aside className={cartOpen ? cart.length > 3 ? 'order-card cart-open cart-scroll' : 'order-card cart-open' : cart.length > 3 ? 'order-card cart-scroll' : 'order-card'} data-items={cart.length > 3 ? 'many' : cart.length}><div className="order-head"><div><span className="eyebrow">CURRENT ORDER</span><h2>{cart.length ? `${cart.length} item${cart.length > 1 ? 's' : ''}` : 'Start an order'}</h2></div><div className="order-head-actions"><button type="button" className="icon-btn sheet-close" onClick={() => setCartOpen(false)} aria-label="Close order"><X size={18} /></button><button className="icon-btn" disabled={saving} onClick={() => setCart([])} aria-label="Clear order"><Trash2 size={17} /></button></div></div><div className="cart-list">{cart.length === 0 ? <EmptyState text="Select a menu item to begin." /> : cart.map(item => <div className="cart-row" key={item.lineId}><span className="product-thumb"><ProductMark product={item} size={16} /></span><div><strong>{item.name}</strong><small title={orderDetail(item)}>{orderDetail(item)}</small></div><div className="qty"><button disabled={saving} onClick={() => updateQty(item.lineId, -1)}>-</button><span>{item.cartQuantity}</span><button disabled={saving} onClick={() => updateQty(item.lineId, 1)}>+</button></div><b>{money(lineUnit(item) * item.cartQuantity)}</b></div>)}</div><div className="order-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div className="total-line"><span>Total</span><strong>{money(total)}</strong></div><label className="pay-field">Payment method<CategoryMenu value={payment} options={paymentOptions} icons={paymentIcons} onChange={setPayment} /></label>{cart.length > 0 && <label className="cash-field">Cash received<input inputMode="decimal" value={cashReceived} onChange={e => { const next = e.target.value; if (next === '' || /^\d*\.?\d{0,2}$/.test(next)) setCashReceived(next); }} placeholder="0.00" /></label>}{cart.length > 0 && <div className={cashReceived !== '' && change < 0 ? 'change-line short' : 'change-line'}><span>{cashReceived !== '' && change < 0 ? 'Short' : 'Change'}</span><strong>{cashReceived === '' ? money(0) : money(Math.abs(change))}</strong></div>}{message && <div className={message === 'Sale completed successfully.' ? 'success-message' : 'form-message'}>{message}</div>}</div><div className="order-footer"><button className={saving ? 'primary-btn full is-saving' : 'primary-btn full'} disabled={!cart.length || !cashReady || saving} aria-busy={saving} onClick={checkout}>{saving ? <><span className="sale-spinner" aria-hidden="true" />Saving sale...</> : <>Complete sale <CreditCard size={16} /></>}</button></div></aside>{cartOpen && <button type="button" className="cart-sheet-backdrop" aria-label="Close order" onClick={() => setCartOpen(false)} />}<button type="button" className="cart-dock" onClick={() => setCartOpen(true)}><ShoppingBag size={18} /><span>{cart.length ? `${cart.length} item${cart.length > 1 ? 's' : ''}` : 'View order'}</span><b>{money(total)}</b></button>{picker && <AddonPicker product={picker} sweetness={sweetness} wantAddons={wantAddons} picked={pickedAddons} onSweetness={setSweetness} onWant={next => { setWantAddons(next); if (!next) setPickedAddons([]); }} onToggle={toggleAddon} onClose={() => setPicker(null)} onConfirm={confirmAdd} />}</div>;
}

function GroupPhoto({ products, category, temperature, onApply }: { products: Product[]; category: Subcategory; temperature?: Temperature; onApply: (category: Subcategory, temperature: Temperature | undefined, imageUrl: string) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const matches = products.filter(item => inImageGroup(item, category, temperature));
  const counts = new Map<string, number>();
  matches.forEach(item => { if (item.image_url) counts.set(item.image_url, (counts.get(item.image_url) || 0) + 1); });
  let current = '';
  let best = 0;
  counts.forEach((count, url) => { if (count > best) { best = count; current = url; } });
  const title = groupName(category, temperature);
  const choose = async (file: File | null) => {
    if (!file) return;
    setBusy(true); setNote('');
    try {
      const url = await uploadProductImage(file);
      await onApply(category, temperature, url);
      setNote('Saved. Every item in this group now uses this photo, including the POS.');
    } catch (err) { setNote(err instanceof Error ? err.message : 'Unable to save photo.'); }
    setBusy(false);
  };
  return <label className="group-photo"><span className="group-photo-preview">{current ? <img src={current} alt="" /> : <ImagePlus size={22} />}</span><span><strong>{title}</strong><small>{busy ? 'Saving photo...' : `One photo for all ${matches.length} items`}</small>{note && <small>{note}</small>}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={e => { void choose(e.target.files?.[0] ?? null); e.currentTarget.value = ''; }} /></label>;
}
function Inventory({ products, setProducts }: { products: Product[]; setProducts: (items: Product[]) => void }) {
  const emptyForm = { name: '', description: '', category: 'Beverages' as MenuGroup, subcategory: 'Coffee' as Subcategory, temperature: 'Hot' as Temperature, size: '16 oz' as Size, price: '', quantity: '' };
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState<Product | null>(null); const [search, setSearch] = useState(''); const [groupFilter, setGroupFilter] = useState<'All' | MenuGroup>('All'); const [filter, setFilter] = useState<'All' | Subcategory>('All'); const [tempFilter, setTempFilter] = useState<'All' | Temperature>('All'); const [form, setForm] = useState(emptyForm); const [imageFile, setImageFile] = useState<File | null>(null); const [preview, setPreview] = useState(''); const [shareImage, setShareImage] = useState(false); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const subcategoryChoices = groupFilter === 'All' ? [...drinkSubs, ...foodSubs] : subcategories[groupFilter];
  const visible = products.filter(p => (groupFilter === 'All' || p.category === groupFilter) && (filter === 'All' || p.subcategory === filter) && (filter !== 'Coffee' || tempFilter === 'All' || p.temperature === tempFilter) && p.name.toLowerCase().includes(search.toLowerCase())); const stock = { total: products.length, ready: products.filter(p => p.quantity > 5).length, low: products.filter(p => p.quantity > 0 && p.quantity <= 5).length, out: products.filter(p => p.quantity === 0).length };
  const temperatures = temperatureOptions[form.subcategory];
  const chooseGroup = (category: MenuGroup) => { const subcategory = subcategories[category][0]; const next = temperatureOptions[subcategory]; setForm(current => ({ ...current, category, subcategory, temperature: next.includes(current.temperature) ? current.temperature : next[0], size: subcategory === 'Frappe' ? '16 oz' : 'Regular' })); };
  const chooseSubcategory = (subcategory: Subcategory) => { const next = temperatureOptions[subcategory]; const category = drinkSubs.includes(subcategory) ? 'Beverages' : 'Food'; setForm(current => ({ ...current, category, subcategory, temperature: next.includes(current.temperature) ? current.temperature : next[0], size: subcategory === 'Frappe' ? '16 oz' : current.size === '6 pcs' || current.size === '12 pcs' ? current.size : 'Regular' })); };
  const chooseImage = (file: File | null) => { setPreview(current => { if (current.startsWith('blob:')) URL.revokeObjectURL(current); return file ? URL.createObjectURL(file) : ''; }); setImageFile(file); };
  const resetForm = () => { setEditing(null); setForm(emptyForm); chooseImage(null); setShareImage(false); setError(''); };
  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({ name: product.name, description: product.description || '', category: product.category, subcategory: product.subcategory, temperature: product.temperature, size: product.size, price: String(product.price), quantity: String(product.quantity) });
    setPreview(current => { if (current.startsWith('blob:')) URL.revokeObjectURL(current); return product.image_url || ''; });
    setImageFile(null); setShareImage(false); setError(''); setModal(true);
  };
  const applyGroupImage = async (category: Subcategory, temperature: Temperature | undefined, imageUrl: string, source: Product[]) => {
    const ids = source.filter(item => inImageGroup(item, category, temperature)).map(item => item.id);
    if (!ids.length) return source;
    const { error: shareError } = await supabase.from('products').update({ image_url: imageUrl }).in('id', ids);
    if (shareError) throw new Error(shareError.message);
    return source.map(item => ids.includes(item.id) ? { ...item, image_url: imageUrl } : item);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSaving(true);
    let imageUrl: string | null = editing?.image_url ?? null;
    try {
      if (imageFile) imageUrl = await uploadProductImage(imageFile);
      if (shareImage && !imageUrl) { setError('Choose a photo before using it for the whole group.'); setSaving(false); return; }
      const payload = { name: form.name.trim(), description: form.description.trim() || null, category: form.category, subcategory: form.subcategory, temperature: form.category === 'Food' ? 'None' as Temperature : form.temperature, size: form.subcategory === 'Frappe' ? form.size : form.category === 'Food' && form.subcategory === 'Snacks' ? form.size : form.category === 'Food' ? 'Regular' as Size : '16 oz' as Size, image_url: imageUrl, price: Number(form.price), quantity: Number(form.quantity || 0) };
      const query = editing ? supabase.from('products').update(payload).eq('id', editing.id) : supabase.from('products').insert(payload);
      const { data, error: saveError } = await query.select().maybeSingle();
      if (saveError || !data) { setError(saveError?.message || 'Unable to save product.'); setSaving(false); return; }
      let next = editing ? products.map(item => item.id === data.id ? data as Product : item) : [data as Product, ...products];
      if (shareImage && imageUrl) next = await applyGroupImage(data.subcategory, splitByTemperature(data.subcategory) ? data.temperature : undefined, imageUrl, next);
      setProducts(next); resetForm(); setModal(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save product.'); }
    setSaving(false);
  };
  const remove = async (id: string) => { if (!window.confirm('Remove this product from your menu?')) return; const { error: removeError } = await supabase.from('products').delete().eq('id', id); if (removeError) { window.alert(removeError.message); return; } setProducts(products.filter(p => p.id !== id)); };
  return <div className="page-stack"><div className="page-intro"><div><span className="eyebrow">STOCK CONTROL</span><h2>Everything your bar needs.</h2><p className="muted">Add products here and they instantly appear in the POS.</p></div><button className="primary-btn" onClick={() => { resetForm(); setModal(true); }}><Plus size={18} /> Add product</button></div><div className="inventory-stats"><StatCard icon={<Box size={18} />} label="Total items" value={String(stock.total)} note="Across all categories" /><StatCard icon={<TrendingUp size={18} />} label="In stock" value={String(stock.ready)} note="Ready to sell" tone="green" /><StatCard icon={<TrendingUp size={18} />} label="Low stock" value={String(stock.low)} note="Restock soon" tone="gold" /><StatCard icon={<X size={18} />} label="Out of stock" value={String(stock.out)} note="Hidden from POS" tone="red" /></div><section className="panel inventory-panel"><div className="inventory-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." /></div><div className="menu-groups inventory-groups">{(['All', ...menuGroups] as const).map(item => <button type="button" className={groupFilter === item ? `active ${item === 'Food' ? 'food' : ''}` : ''} key={item} onClick={() => { setGroupFilter(item); setFilter('All'); setTempFilter('All'); }}>{item}</button>)}</div><CategoryMenu value={filter} options={['All', ...subcategoryChoices]} onChange={value => { const next = value as 'All' | Subcategory; setFilter(next); if (next !== 'Coffee') setTempFilter('All'); }} />{filter === 'Coffee' && <div className="temp-filter" role="group" aria-label="Hot or iced">{(['All', 'Hot', 'Iced'] as const).map(option => <button type="button" key={option} className={tempFilter === option ? `active ${option.toLowerCase()}` : ''} onClick={() => setTempFilter(option)}>{option}</button>)}</div>}</div>{filter !== 'All' && <div className="group-photos">{(splitByTemperature(filter) ? (filter === 'Coffee' && tempFilter !== 'All' ? [tempFilter] : temperatureOptions[filter]) : [undefined]).map(temperature => <GroupPhoto key={`${filter}-${temperature || 'all'}`} products={products} category={filter} temperature={temperature} onApply={(category, groupTemperature, imageUrl) => applyGroupImage(category, groupTemperature, imageUrl, products).then(setProducts)} />)}</div>}<div className="table-wrap"><table><thead><tr><th>Product</th><th>Menu</th><th>Price</th><th>Current stock</th><th>Status</th><th /></tr></thead><tbody>{visible.map(product => <tr key={product.id}><td data-label="Product"><div className="table-product"><span className="product-thumb"><ProductMark product={product} /></span><span><strong>{product.name}</strong><small>{product.description || 'No description'}</small></span></div></td><td data-label="Menu"><div className="table-product"><span><strong>{product.subcategory}</strong><small>{product.category}{product.temperature !== 'None' ? ` · ${variantLabel(product)}` : product.size !== 'Regular' ? ` · ${product.size}` : ''}</small></span></div></td><td data-label="Price">{money(Number(product.price))}</td><td data-label="Stock">{product.quantity} units</td><td data-label="Status"><span className={`badge ${product.quantity === 0 ? 'out' : product.quantity <= 5 ? 'low' : 'in'}`}>{product.quantity === 0 ? 'Out of stock' : product.quantity <= 5 ? 'Low stock' : 'In stock'}</span></td><td><div className="row-actions"><button className="edit-btn" type="button" aria-label={`Edit ${product.name}`} onClick={() => openEdit(product)}><Pencil size={16} /></button><button className="delete-btn" type="button" aria-label={`Remove ${product.name}`} onClick={() => remove(product.id)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table>{visible.length === 0 && <EmptyState text="No products match your search." />}</div></section>{modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) { resetForm(); setModal(false); } }}><div className="modal"><div className="modal-head"><div><span className="eyebrow">{editing ? 'UPDATE MENU ITEM' : 'NEW MENU ITEM'}</span><h2>{editing ? 'Edit product' : 'Add product'}</h2></div><button className="icon-btn" onClick={() => { resetForm(); setModal(false); }}><X size={20} /></button></div><form onSubmit={save}><label>Category<div className="choice-row" role="group" aria-label="Category">{menuGroups.map(option => <button type="button" key={option} className={form.category === option ? 'active' : ''} onClick={() => chooseGroup(option)}>{option}</button>)}</div></label><label>Subcategory<CategoryMenu value={form.subcategory} options={subcategories[form.category]} onChange={value => chooseSubcategory(value as Subcategory)} /></label>{form.category === 'Beverages' && <label>{temperatures.length > 1 ? 'Hot or iced' : 'Temperature'}<div className="choice-row" role="group" aria-label="Temperature">{temperatures.map(option => <button type="button" key={option} className={form.temperature === option ? 'active' : ''} disabled={temperatures.length === 1} onClick={() => setForm({ ...form, temperature: option })}>{option}{temperatures.length === 1 ? ' · default' : ''}</button>)}</div></label>}{form.subcategory === 'Frappe' && <label>Size<div className="choice-row" role="group" aria-label="Size">{frappeSizes.map(option => <button type="button" key={option} className={form.size === option ? 'active' : ''} onClick={() => setForm({ ...form, size: option })}>{option}</button>)}</div></label>}{form.category === 'Food' && form.subcategory === 'Snacks' && <label>Portion<div className="choice-row" role="group" aria-label="Portion">{snackSizes.map(option => <button type="button" key={option} className={form.size === option ? 'active' : ''} onClick={() => setForm({ ...form, size: option })}>{option}</button>)}</div></label>}<label>Product name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Spanish Latte" /></label><label>Short description <span className="optional">optional</span><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="A little detail for your team..." rows={3} /></label><label className="image-field">Product photo <span className="optional">optional</span><span className="image-picker">{preview ? <img src={preview} alt="Selected product" /> : <span><ImagePlus size={22} /> Upload a photo</span>}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => chooseImage(e.target.files?.[0] ?? null)} /></span></label><label className="share-check"><input type="checkbox" checked={shareImage} onChange={e => setShareImage(e.target.checked)} /><span>Use this photo for every {groupName(form.subcategory, splitByTemperature(form.subcategory) ? form.temperature : undefined)}</span></label><div className="form-grid"><label>Price<input required min="0" step="0.01" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" /></label><label>Quantity <span className="optional">optional</span><input min="0" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0" /></label></div>{error && <div className="form-message">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => { resetForm(); setModal(false); }}>Cancel</button><button className="primary-btn" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Save product'} <ChevronRight size={16} /></button></div></form></div></div>}</div>;
}

type SalesRange = 'week' | 'month' | 'year';
const rangeLabel: Record<SalesRange, string> = { week: 'This week', month: 'This month', year: 'This year' };
function periodEnd(range: SalesRange, now = new Date()) {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  if (range === 'week') { const start = periodStart('week', now); end.setTime(start.getTime()); end.setDate(start.getDate() + 6); }
  else if (range === 'month') end.setMonth(end.getMonth() + 1, 0);
  else end.setMonth(11, 31);
  return end;
}
function expensesInRange(items: Expense[], range: SalesRange, now = new Date()) {
  const start = localDateKey(periodStart(range, now));
  const end = localDateKey(periodEnd(range, now));
  return items.filter(item => item.spent_on >= start && item.spent_on <= end);
}
function periodStart(range: SalesRange, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  else if (range === 'month') start.setDate(1);
  else start.setMonth(0, 1);
  return start;
}
function chartBuckets(range: SalesRange, now = new Date()) {
  if (range === 'week') {
    const start = periodStart('week', now);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return { id: day.toDateString(), label: day.toLocaleDateString('en-PH', { weekday: 'short' }), sheetLabel: day.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }), match: (date: Date) => date.toDateString() === day.toDateString() };
    });
  }
  if (range === 'month') {
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array.from({ length: days }, (_, index) => {
      const day = new Date(now.getFullYear(), now.getMonth(), index + 1);
      return { id: day.toDateString(), label: String(index + 1), sheetLabel: day.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }), match: (date: Date) => date.toDateString() === day.toDateString() };
    });
  }
  return Array.from({ length: 12 }, (_, month) => {
    const day = new Date(now.getFullYear(), month, 1);
    return { id: String(month), label: day.toLocaleDateString('en-PH', { month: 'short' }), sheetLabel: day.toLocaleDateString('en-PH', { month: 'long' }), match: (date: Date) => date.getFullYear() === now.getFullYear() && date.getMonth() === month };
  });
}
function dayBuckets(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  const base = new Date(year, (month || 1) - 1, day || 1);
  return Array.from({ length: 24 }, (_, hour) => {
    const stamp = new Date(base);
    stamp.setHours(hour, 0, 0, 0);
    return { id: `${key}-${hour}`, label: hour % 3 === 0 ? stamp.toLocaleTimeString('en-PH', { hour: 'numeric' }) : '', sheetLabel: stamp.toLocaleTimeString('en-PH', { hour: 'numeric' }), match: (date: Date) => localDateKey(date) === key && date.getHours() === hour };
  });
}
function downloadSheet(filename: string, rows: (string | number)[][]) {
  const cell = (value: string | number) => `<td>${String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</td>`;
  const table = rows.map(row => `<tr>${row.map(cell).join('')}</tr>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table>${table}</table></body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
function SalesAnalytics({ sales, expenses }: { sales: Sale[]; expenses: Expense[] }) {
  const [range, setRange] = useState<SalesRange>('week');
  const [pickedDate, setPickedDate] = useState('');
  const filtered = (pickedDate ? sales.filter(sale => localDateKey(new Date(sale.created_at)) === pickedDate) : sales.filter(sale => new Date(sale.created_at) >= periodStart(range))).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  const periodExpenses = pickedDate ? expenses.filter(item => item.spent_on === pickedDate) : expensesInRange(expenses, range);
  const revenue = filtered.reduce((sum, sale) => sum + Number(sale.total), 0);
  const spent = expenseTotal(periodExpenses);
  const net = revenue - spent;
  const average = filtered.length ? revenue / filtered.length : 0;
  const periodName = pickedDate ? formatDay(pickedDate) : rangeLabel[range];
  const points = (pickedDate ? dayBuckets(pickedDate) : chartBuckets(range)).map(bucket => ({ ...bucket, total: filtered.reduce((sum, sale) => bucket.match(new Date(sale.created_at)) ? sum + Number(sale.total) : sum, 0) }));
  const max = Math.max(...points.map(point => point.total), 1);
  const dense = Boolean(pickedDate) || range === 'month';
  const exportSheet = () => {
    const fileName = pickedDate ? `DQ-Cafe-sales-${pickedDate}.xls` : `DQ-Cafe-sales-${range}.xls`;
    downloadSheet(fileName, [
      ['DQ-Cafe Sales'],
      ['Period', periodName],
      [],
      ['Gross income', revenue.toFixed(2)],
      ['Expenses', spent.toFixed(2)],
      ['Net income', net.toFixed(2)],
      ['Transactions', filtered.length],
      ['Average order', average.toFixed(2)],
      [],
      ['Orders'],
      ['Date', 'Time', 'Payment', 'Total'],
      ...filtered.map(sale => {
        const when = new Date(sale.created_at);
        return [when.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }), when.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }), sale.payment_method, Number(sale.total).toFixed(2)];
      }),
      [],
      ['Revenue trend'],
      [pickedDate ? 'Hour' : range === 'year' ? 'Month' : 'Day', 'Total'],
      ...points.map(point => [point.sheetLabel, point.total.toFixed(2)]),
    ]);
  };
  return <div className="page-stack">
    <div className="page-intro">
      <div><span className="eyebrow">BUSINESS PULSE</span><h2>Know what is working.</h2><p className="muted">Gross income, expenses, and net for {pickedDate ? periodName : rangeLabel[range].toLowerCase()}.</p></div>
      <div className="sales-tools">
        <div className="range-pills" role="group" aria-label="Sales period">{(['week', 'month', 'year'] as const).map(option => <button key={option} type="button" className={!pickedDate && range === option ? 'active' : ''} onClick={() => { setPickedDate(''); setRange(option); }}>{rangeLabel[option]}</button>)}</div>
        <label className={pickedDate ? 'date-icon-btn active' : 'date-icon-btn'}><Calendar size={18} /><input type="date" aria-label="Show sales for a specific date" value={pickedDate} onChange={event => setPickedDate(event.target.value)} /></label>
        {pickedDate && <button type="button" className="date-chip" onClick={() => setPickedDate('')}><span>{formatDay(pickedDate)}</span><X size={14} /></button>}
        <button type="button" className="secondary-btn export-btn" onClick={exportSheet}><Download size={16} /> Export</button>
      </div>
    </div>
    <div className="stats-grid sales-stats"><StatCard icon={<CreditCard size={19} />} label="Gross income" value={money(revenue)} note={periodName} /><StatCard icon={<Receipt size={19} />} label="Expenses" value={money(spent)} note={periodName} tone="gold" /><StatCard icon={<TrendingUp size={19} />} label="Net income" value={money(net)} note="After expenses" tone={net < 0 ? 'red' : 'green'} kind={net < 0 ? 'loss' : 'net'} /><StatCard icon={<ShoppingBag size={19} />} label="Transactions" value={String(filtered.length)} note="Completed orders" tone="brown" /><StatCard icon={<Banknote size={19} />} label="Average order" value={money(average)} note="Per transaction" /></div>
    <div className="analytics-grid">
      <section className="panel chart-panel"><div className="section-heading"><div><span className="eyebrow">REVENUE TREND</span><h3>{periodName}</h3></div><div className="chart-figures"><div><span>Gross</span><strong>{money(revenue)}</strong></div><div><span>Net</span><strong className={net < 0 ? 'down' : ''}>{money(net)}</strong></div></div></div><div className={dense ? 'bars dense' : 'bars'}><div className="bar-grid" aria-hidden="true"><span /><span /><span /><span /></div>{points.map(point => { const height = point.total ? `${Math.max(8, point.total / max * 100)}%` : '2px'; const shown = point.total > 0 && !dense; return <div className="bar-group" key={point.id} style={{ '--bar': height } as CSSProperties}><div className="bar-plot"><div className={point.total ? point.total === max ? 'bar peak' : 'bar' : 'bar empty'} data-amount={money(point.total)} title={`${point.sheetLabel}: ${money(point.total)}`}>{shown && <em className="bar-value">{`₱${Math.round(point.total).toLocaleString('en-PH')}`}</em>}</div></div><small>{point.label}</small></div>; })}</div>{!filtered.length && <p className="muted chart-note">{pickedDate ? 'No sales on this day.' : 'No sales in this period yet.'}</p>}</section>
      <section className="panel"><div className="section-heading"><div><span className="eyebrow">{pickedDate ? 'SELECTED DAY' : 'ORDERS'}</span><h3>{pickedDate ? periodName : 'Orders in view'}</h3></div></div><div className="sales-list">{filtered.map(sale => <div className="sale-row" key={sale.id}><span className="product-thumb"><CreditCard size={16} /></span><span><strong>{new Date(sale.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</strong><small>{sale.payment_method} · {new Date(sale.created_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</small></span><b>{money(Number(sale.total))}</b></div>)}{!filtered.length && <EmptyState text={pickedDate ? 'No sales on this day.' : 'No sales in this period yet.'} />}</div></section>
    </div>
  </div>;
}
function ExpensesPage({ expenses, setExpenses }: { expenses: Expense[]; setExpenses: (items: Expense[]) => void }) {
  const [range, setRange] = useState<SalesRange>('week');
  const [pickedDate, setPickedDate] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Rent');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [spentOn, setSpentOn] = useState(() => localDateKey());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const icons: Record<string, ReactNode> = Object.fromEntries(expenseCategories.map(item => [item, expenseIcon(item)]));
  const visible = (pickedDate ? expenses.filter(item => item.spent_on === pickedDate) : expensesInRange(expenses, range)).slice().sort((a, b) => b.spent_on.localeCompare(a.spent_on) || b.created_at.localeCompare(a.created_at));
  const total = expenseTotal(visible);
  const periodName = pickedDate ? formatDay(pickedDate) : rangeLabel[range];
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) { setMessage({ tone: 'error', text: 'Enter an amount greater than zero.' }); return; }
    if (!spentOn) { setMessage({ tone: 'error', text: 'Choose the date of this expense.' }); return; }
    setSaving(true);
    const { data, error } = await supabase.from('expenses').insert({ category, label: category, amount: value, notes: notes.trim() || null, spent_on: spentOn }).select().maybeSingle();
    setSaving(false);
    if (error || !data) { setMessage({ tone: 'error', text: /schema cache|does not exist|Could not find the table|expenses_category_check/i.test(error?.message || '') ? 'Update the expenses categories in Supabase, then save again.' : (error?.message || 'Unable to save expense.') }); return; }
    setExpenses([...expenses, data as Expense].sort((a, b) => b.spent_on.localeCompare(a.spent_on) || b.created_at.localeCompare(a.created_at)));
    setAmount('');
    setNotes('');
    setMessage({ tone: 'ok', text: 'Expense saved.' });
  };
  const remove = async (id: string) => {
    if (!window.confirm('Remove this expense?')) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { setMessage({ tone: 'error', text: error.message }); return; }
    setExpenses(expenses.filter(item => item.id !== id));
  };
  return <div className="page-stack">
    <div className="page-intro">
      <div><span className="eyebrow">DAILY COSTS</span><h2>Keep every peso accounted for.</h2><p className="muted">Rent, utilities, wages, and the other costs of running the shop.</p></div>
      <div className="expense-filters">
        <div className="range-pills" role="group" aria-label="Expense period">{(['week', 'month', 'year'] as const).map(option => <button key={option} type="button" className={!pickedDate && range === option ? 'active' : ''} onClick={() => { setPickedDate(''); setRange(option); }}>{rangeLabel[option]}</button>)}</div>
        <label className={pickedDate ? 'date-icon-btn active' : 'date-icon-btn'} title="Choose a date"><Calendar size={18} /><input type="date" aria-label="Show expenses for a specific date" value={pickedDate} onChange={event => setPickedDate(event.target.value)} /></label>
        {pickedDate && <button type="button" className="date-chip" onClick={() => setPickedDate('')}><span>{formatDay(pickedDate)}</span><X size={14} /></button>}
      </div>
    </div>
    <div className="expenses-layout">
      <section className="panel expense-composer">
        <div className="section-heading"><div><span className="eyebrow">NEW EXPENSE</span><h3>Add a cost</h3></div></div>
        <form onSubmit={save}>
          <label>Category<CategoryMenu value={category} options={expenseCategories} icons={icons} onChange={value => setCategory(value as ExpenseCategory)} /></label>
          <div className="form-grid">
            <label>Amount<input required inputMode="decimal" value={amount} onChange={event => { const next = event.target.value; if (next === '' || /^\d*\.?\d{0,2}$/.test(next)) setAmount(next); }} placeholder="0.00" /></label>
            <label>Date<input required type="date" value={spentOn} onChange={event => setSpentOn(event.target.value)} /></label>
          </div>
          <label>Notes <span className="optional">optional</span><textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="A short reminder for this cost" rows={3} /></label>
          {message && <div className={message.tone === 'ok' ? 'success-message' : 'form-message'}>{message.text}</div>}
          <button className="primary-btn full" disabled={saving}>{saving ? 'Saving...' : 'Save expense'} <ChevronRight size={16} /></button>
        </form>
      </section>
      <section className="panel expense-ledger">
        <div className="section-heading">
          <div><span className="eyebrow">{pickedDate ? 'SELECTED DAY' : rangeLabel[range].toUpperCase()}</span><h3>{pickedDate ? formatDay(pickedDate) : 'Expenses'}</h3></div>
          <div className="spent-total-wrap"><strong>{money(total)}</strong><small>{visible.length} {visible.length === 1 ? 'record' : 'records'} · {periodName}</small></div>
        </div>
        {visible.length === 0 ? <EmptyState text={pickedDate ? 'No expenses on this day.' : `No expenses for ${rangeLabel[range].toLowerCase()}.`} /> : <div className="expense-list">{visible.map(item => <ExpenseRow key={item.id} expense={item} onRemove={remove} />)}</div>}
      </section>
    </div>
  </div>;
}

function SettingsPage({ session }: { session: Session }) {
  const email = session.user.email || '';
  const savedName = session.user.user_metadata?.full_name || '';
  const [fullName, setFullName] = useState(savedName);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMessage, setAccountMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [showPassword, setShowPassword] = useState({ current: false, next: false, confirm: false });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const initial = (savedName || email || 'O')[0].toUpperCase();

  const saveAccount = async (event: FormEvent) => {
    event.preventDefault();
    const name = fullName.trim();
    setAccountMessage(null);
    if (!name) { setAccountMessage({ tone: 'error', text: 'Enter your name.' }); return; }
    setAccountBusy(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    setAccountBusy(false);
    setAccountMessage(error ? { tone: 'error', text: error.message } : { tone: 'ok', text: 'Account updated.' });
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordMessage(null);
    if (password.next.length < 6) { setPasswordMessage({ tone: 'error', text: 'New password must be at least 6 characters.' }); return; }
    if (password.next !== password.confirm) { setPasswordMessage({ tone: 'error', text: 'New passwords do not match.' }); return; }
    if (!email) { setPasswordMessage({ tone: 'error', text: 'This account has no email address.' }); return; }
    setPasswordBusy(true);
    const check = await supabase.auth.signInWithPassword({ email, password: password.current });
    if (check.error) { setPasswordBusy(false); setPasswordMessage({ tone: 'error', text: /invalid|credentials/i.test(check.error.message) ? 'Current password is incorrect.' : check.error.message }); return; }
    const { error } = await supabase.auth.updateUser({ password: password.next });
    setPasswordBusy(false);
    if (error) { setPasswordMessage({ tone: 'error', text: error.message }); return; }
    setPassword({ current: '', next: '', confirm: '' });
    setPasswordMessage({ tone: 'ok', text: 'Password updated.' });
  };

  return <div className="account-layout">
    <section className="panel settings-panel">
      <div className="settings-identity"><div className="settings-avatar">{initial}</div><div><strong>{savedName || 'DQ-Cafe Owner'}</strong><p className="muted">{email}</p></div></div>
      <form className="settings-form" onSubmit={saveAccount}>
        <div className="account-fields">
          <label>Full name<input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Juan Dela Cruz" /></label>
          <label>Email address<input readOnly value={email} /></label>
        </div>
        {accountMessage && <div className={accountMessage.tone === 'ok' ? 'success-message' : 'form-message'}>{accountMessage.text}</div>}
        <div className="settings-actions"><button className="primary-btn" disabled={accountBusy}>{accountBusy ? 'Saving...' : 'Save account'}</button></div>
      </form>
      <div className="account-divider" />
      <form className="settings-form" onSubmit={changePassword}>
        <div className="settings-panel-head"><Lock size={15} /><h3>Change password</h3></div>
        <div className="password-grid">
          <label>Current password<span className="input-wrap"><input required type={showPassword.current ? 'text' : 'password'} value={password.current} onChange={e => setPassword({ ...password, current: e.target.value })} placeholder="••••••••" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })} aria-label="Toggle current password visibility">{showPassword.current ? <EyeOff size={15} /> : <Eye size={15} />}</button></span></label>
          <label>New password<span className="input-wrap"><input required minLength={6} type={showPassword.next ? 'text' : 'password'} value={password.next} onChange={e => setPassword({ ...password, next: e.target.value })} placeholder="••••••••" autoComplete="new-password" /><button type="button" onClick={() => setShowPassword({ ...showPassword, next: !showPassword.next })} aria-label="Toggle new password visibility">{showPassword.next ? <EyeOff size={15} /> : <Eye size={15} />}</button></span></label>
          <label>Confirm password<span className="input-wrap"><input required minLength={6} type={showPassword.confirm ? 'text' : 'password'} value={password.confirm} onChange={e => setPassword({ ...password, confirm: e.target.value })} placeholder="••••••••" autoComplete="new-password" /><button type="button" onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })} aria-label="Toggle confirm password visibility">{showPassword.confirm ? <EyeOff size={15} /> : <Eye size={15} />}</button></span></label>
        </div>
        {passwordMessage && <div className={passwordMessage.tone === 'ok' ? 'success-message' : 'form-message'}>{passwordMessage.text}</div>}
        <div className="settings-actions"><button className="primary-btn" disabled={passwordBusy}>{passwordBusy ? 'Updating...' : 'Update password'}</button></div>
      </form>
    </section>
  </div>;
}
function EmptyState({ text }: { text: string }) { return <div className="empty-state"><Coffee size={23} /><p>{text}</p></div>; }
export default App;
