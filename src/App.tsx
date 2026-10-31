import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { ensureMenu } from '@/data/menuSeed';
import { BarChart3, Box, ChevronDown, Coffee, CreditCard, Eye, EyeOff, ImagePlus, LayoutDashboard, Lock, LogOut, Menu, Moon, Pencil, Plus, Search, Settings, ShoppingBag, Sun, Trash2, TrendingUp, UserRound, X, ChevronRight } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

type Category = 'Coffee' | 'Non Coffee' | 'Matcha Series' | 'Frappe' | 'Sparkling Series' | 'Tea Infusion' | 'Specialty hot coffee';
type Temperature = 'Hot' | 'Iced';
type Size = '16 oz' | '22 oz';
type Page = 'dashboard' | 'pos' | 'inventory' | 'sales' | 'settings';
type Product = { id: string; name: string; description: string | null; category: Category; temperature: Temperature; size: Size; image_url: string | null; price: number; quantity: number; created_at: string };
type CartItem = Product & { cartQuantity: number };
type Sale = { id: string; subtotal: number; tax: number; total: number; payment_method: string; created_at: string };

const logo = '/icon.png';
const THEME_KEY = 'dq-theme';
const applyTheme = (dark: boolean) => {
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
};
const money = (value: number) => `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const categories: Category[] = ['Coffee', 'Non Coffee', 'Matcha Series', 'Frappe', 'Sparkling Series', 'Tea Infusion', 'Specialty hot coffee'];
const sizes: Size[] = ['16 oz', '22 oz'];
const temperatureOptions: Record<Category, Temperature[]> = {
  Coffee: ['Hot', 'Iced'],
  'Non Coffee': ['Iced'],
  'Matcha Series': ['Hot', 'Iced'],
  Frappe: ['Iced'],
  'Sparkling Series': ['Iced'],
  'Tea Infusion': ['Iced'],
  'Specialty hot coffee': ['Hot'],
};
const hasSize = (product: Pick<Product, 'category'>) => product.category === 'Frappe';
const productMeta = (product: Pick<Product, 'category' | 'temperature' | 'size'>) => [product.category, product.temperature, hasSize(product) ? product.size : ''].filter(Boolean).join(' · ');
const variantLabel = (product: Pick<Product, 'category' | 'temperature' | 'size'>) => hasSize(product) ? `${product.temperature} · ${product.size}` : product.temperature;
function ProductMark({ product, size = 16 }: { product: Pick<Product, 'image_url' | 'name'>; size?: number }) {
  if (product.image_url) return <img src={product.image_url} alt="" />;
  return <Coffee size={size} />;
}

function CategoryMenu({ value, options, onChange }: { value: string; options: readonly string[]; onChange: (value: string) => void }) {
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
    <button type="button" className="menu-select-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => { if (open) { setOpen(false); return; } placeMenu(); setOpen(true); }}><span>{value}</span><ChevronDown size={18} /></button>
    {open && createPortal(<ul className="menu-select-list" role="listbox" ref={listRef} style={{ top: place.top, left: place.left, width: place.width }}>{options.map(option => <li key={option}><button type="button" role="option" aria-selected={option === value} className={option === value ? 'active' : ''} onClick={() => { onChange(option); setOpen(false); }}>{option}</button></li>)}</ul>, document.body)}
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

  const previewSession = import.meta.env.DEV && window.location.hash === '#settings-preview'
    ? { user: { email: 'oscar@dq-cafe.com', user_metadata: { full_name: 'Oscar Llabres' } } } as Session
    : null;
  if (authLoading && !previewSession) return <div className="auth-loading"><Coffee size={30} /><span>Preparing your coffee bar...</span></div>;
  const activeSession = session || previewSession;
  return activeSession ? <AdminApp session={activeSession} /> : <AuthScreen />;
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
  const [page, setPage] = useState<Page>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const loadData = async () => {
    await ensureMenu();
    const [{ data: productData }, { data: saleData }] = await Promise.all([supabase.from('products').select('*').order('created_at', { ascending: false }), supabase.from('sales').select('*').order('created_at', { ascending: false })]);
    setProducts((productData as Product[]) ?? []); setSales((saleData as Sale[]) ?? []);
  };
  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (settingsOpen) settingsMenuRef.current?.scrollIntoView({ block: 'nearest' }); }, [settingsOpen]);
  const userName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Owner';
  const navigate = (next: Page) => { setPage(next); setMobileOpen(false); if (next !== 'settings') setSettingsOpen(false); };
  const toggleDark = () => { const next = !dark; applyTheme(next); setDark(next); };
  return <div className="app-shell"><aside className={mobileOpen ? 'sidebar open' : 'sidebar'}><div className="sidebar-brand"><img src={logo} alt="DQ-Cafe" /><div><strong>DQ-Cafe</strong><small>Admin workspace</small></div></div><nav><NavButton icon={<LayoutDashboard size={18} />} label="Overview" active={page === 'dashboard'} onClick={() => navigate('dashboard')} /><NavButton icon={<ShoppingBag size={18} />} label="Point of Sale" active={page === 'pos'} onClick={() => navigate('pos')} /><NavButton icon={<Box size={18} />} label="Inventory" active={page === 'inventory'} onClick={() => navigate('inventory')} /><NavButton icon={<BarChart3 size={18} />} label="Sales & Analytics" active={page === 'sales'} onClick={() => navigate('sales')} /><div className="nav-group"><button className={settingsOpen || page === 'settings' ? 'nav-button active' : 'nav-button'} aria-expanded={settingsOpen} onClick={() => setSettingsOpen(open => !open)}><Settings size={18} /><span>Settings</span><ChevronDown size={16} className={settingsOpen ? 'nav-chevron open' : 'nav-chevron'} /></button><div className={settingsOpen ? 'nav-submenu-wrap open' : 'nav-submenu-wrap'}><div className="nav-submenu" ref={settingsMenuRef}><button className={page === 'settings' ? 'nav-sub active' : 'nav-sub'} onClick={() => navigate('settings')}><UserRound size={16} /><span>Account settings</span></button><button type="button" className="nav-sub" role="switch" aria-checked={dark} onClick={toggleDark}>{dark ? <Moon size={16} /> : <Sun size={16} />}<span>Dark mode</span><span className={dark ? 'switch nav-switch on' : 'switch nav-switch'} aria-hidden="true"><span /></span></button></div></div></div></nav><div className="sidebar-bottom"><button className="nav-button" onClick={() => supabase.auth.signOut()}><LogOut size={18} /> <span>Sign out</span></button></div></aside><div className="main-shell"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}><Menu size={20} /></button><div className="topbar-title"><span className="eyebrow">DQ-CAFE / {page === 'dashboard' ? 'TODAY AT A GLANCE' : page === 'settings' ? 'ACCOUNT' : page.replace('-', ' ').toUpperCase()}</span><h1>{page === 'dashboard' ? 'Good morning, ' + userName.split(' ')[0] + '.' : page === 'pos' ? 'Point of Sale' : page === 'inventory' ? 'Inventory' : page === 'sales' ? 'Sales & Analytics' : 'Account settings'}</h1></div><div className="topbar-user"><span className="avatar">{userName[0].toUpperCase()}</span><span>{userName}</span><span className="status-dot" /></div></header><main className="content page-enter" key={page}>{page === 'dashboard' && <Dashboard products={products} sales={sales} navigate={navigate} />}{page === 'pos' && <POS products={products} cart={cart} setCart={setCart} onSale={loadData} />}{page === 'inventory' && <Inventory products={products} setProducts={setProducts} />}{page === 'sales' && <SalesAnalytics sales={sales} />}{page === 'settings' && <SettingsPage session={session} />}</main></div></div>;
}

function NavButton({ icon, label, active, onClick }: { icon: ReactNode; label: string; active: boolean; onClick: () => void }) { return <button className={active ? 'nav-button active' : 'nav-button'} onClick={onClick}>{icon}<span>{label}</span></button>; }
function StatCard({ icon, label, value, note, tone = 'gold' }: { icon: ReactNode; label: string; value: string; note: string; tone?: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>; }

function Dashboard({ products, sales, navigate }: { products: Product[]; sales: Sale[]; navigate: (page: Page) => void }) {
  const revenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0); const lowStock = products.filter(p => p.quantity <= 5).length; const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString());
  return <div className="page-stack"><section className="hero-card"><div><span className="eyebrow light">YOUR DAILY BRIEF</span><h2>Make today<br /><em>worth sipping.</em></h2><p>Keep the bar flowing, the shelves ready, and every order feeling personal.</p><button className="light-btn" onClick={() => navigate('pos')}>Open POS <ChevronRight size={16} /></button></div><div className="hero-orb"><Coffee size={32} /></div></section><div className="stats-grid"><StatCard icon={<CreditCard size={19} />} label="Total revenue" value={money(revenue)} note="All-time recorded sales" /><StatCard icon={<ShoppingBag size={19} />} label="Orders today" value={String(todaySales.length)} note="Keep the momentum going" tone="green" /><StatCard icon={<Box size={19} />} label="Menu items" value={String(products.length)} note="Active products" tone="brown" /><StatCard icon={<TrendingUp size={19} />} label="Needs attention" value={String(lowStock)} note="Items with low stock" tone="red" /></div><div className="dashboard-grid"><section className="panel quick-panel"><div className="section-heading"><div><span className="eyebrow">QUICK ACTIONS</span><h3>Keep things moving</h3></div></div><div className="quick-actions"><button onClick={() => navigate('pos')}><span className="quick-icon brown"><ShoppingBag size={20} /></span><span><strong>New order</strong><small>Serve a customer</small></span><ChevronRight size={17} /></button><button onClick={() => navigate('inventory')}><span className="quick-icon gold"><Plus size={20} /></span><span><strong>Add a product</strong><small>Update your menu</small></span><ChevronRight size={17} /></button><button onClick={() => navigate('sales')}><span className="quick-icon green"><BarChart3 size={20} /></span><span><strong>View performance</strong><small>Read your numbers</small></span><ChevronRight size={17} /></button></div></section><section className="panel"><div className="section-heading"><div><span className="eyebrow">MENU SNAPSHOT</span><h3>Popular on your menu</h3></div><button className="text-btn" onClick={() => navigate('inventory')}>View all</button></div>{products.length === 0 ? <EmptyState text="Your menu is waiting for its first product." /> : <div className="mini-list">{products.slice(0, 4).map(product => <div className="mini-row" key={product.id}><span className="product-thumb"><ProductMark product={product} size={17} /></span><span><strong>{product.name}</strong><small>{productMeta(product)}</small></span><b>{money(Number(product.price))}</b></div>)}</div>}</section></div></div>;
}

function POS({ products, cart, setCart, onSale }: { products: Product[]; cart: CartItem[]; setCart: (items: CartItem[]) => void; onSale: () => Promise<void> }) {
  const [category, setCategory] = useState<'All' | Category>('All'); const [search, setSearch] = useState(''); const [payment, setPayment] = useState('Cash'); const [cashReceived, setCashReceived] = useState(''); const [message, setMessage] = useState('');
  const visible = products.filter(p => (category === 'All' || p.category === category) && p.name.toLowerCase().includes(search.toLowerCase())); const subtotal = cart.reduce((s, p) => s + Number(p.price) * p.cartQuantity, 0); const tax = subtotal * 0.12; const total = subtotal + tax;
  const add = (product: Product) => { if (product.quantity === 0) return; const exists = cart.find(item => item.id === product.id); setCart(exists ? cart.map(item => item.id === product.id ? { ...item, cartQuantity: Math.min(item.cartQuantity + 1, product.quantity) } : item) : [...cart, { ...product, cartQuantity: 1 }]); };
  const updateQty = (id: string, delta: number) => setCart(cart.map(item => item.id === id ? { ...item, cartQuantity: Math.max(0, Math.min(item.quantity, item.cartQuantity + delta)) } : item).filter(item => item.cartQuantity > 0));
  const receivedCents = Math.round((Number(cashReceived) || 0) * 100); const totalCents = Math.round(total * 100); const change = (receivedCents - totalCents) / 100; const cashReady = payment !== 'Cash' || (cashReceived !== '' && receivedCents >= totalCents);
  const checkout = async () => { if (!cart.length || !cashReady) return; setMessage(''); const { data: sale, error } = await supabase.from('sales').insert({ subtotal, tax, total, payment_method: payment }).select().maybeSingle(); if (error || !sale) { setMessage(error?.message || 'Unable to complete sale.'); return; } const { error: itemsError } = await supabase.from('sale_items').insert(cart.map(item => ({ sale_id: sale.id, product_id: item.id, product_name: `${item.name} (${hasSize(item) ? `${item.temperature} ${item.size}` : item.temperature})`, quantity: item.cartQuantity, unit_price: item.price, line_total: Number(item.price) * item.cartQuantity }))); if (itemsError) { setMessage(itemsError.message); return; } await Promise.all(cart.map(item => supabase.from('products').update({ quantity: item.quantity - item.cartQuantity }).eq('id', item.id))); setCart([]); setCashReceived(''); await onSale(); setMessage('Sale completed successfully.'); };
  return <div className="pos-layout"><section className="pos-menu"><div className="toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu..." /></div><div className="category-pills"><button className={category === 'All' ? 'active' : ''} onClick={() => setCategory('All')}>All</button>{categories.map(item => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div></div>{visible.length === 0 ? <div className="panel"><EmptyState text="No products found. Add one from Inventory." /></div> : <div className="product-grid">{visible.map(product => <button className="product-card" key={product.id} onClick={() => add(product)} disabled={product.quantity === 0}><div className="product-art"><ProductMark product={product} size={31} /></div><div className="product-info"><div><strong>{product.name}</strong><small>{productMeta(product)}</small></div><b>{money(Number(product.price))}</b></div><span className="add-product">{product.quantity === 0 ? 'Out of stock' : '+ Add to order'}</span></button>)}</div>}</section><aside className="order-card"><div className="order-head"><div><span className="eyebrow">CURRENT ORDER</span><h2>{cart.length ? `${cart.length} item${cart.length > 1 ? 's' : ''}` : 'Start an order'}</h2></div><button className="icon-btn" onClick={() => setCart([])}><Trash2 size={17} /></button></div><div className="cart-list">{cart.length === 0 ? <EmptyState text="Select a menu item to begin." /> : cart.map(item => <div className="cart-row" key={item.id}><span className="product-thumb"><ProductMark product={item} size={16} /></span><div><strong>{item.name}</strong><small>{variantLabel(item)}</small></div><div className="qty"><button onClick={() => updateQty(item.id, -1)}>-</button><span>{item.cartQuantity}</span><button onClick={() => updateQty(item.id, 1)}>+</button></div><b>{money(Number(item.price) * item.cartQuantity)}</b></div>)}</div><div className="order-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>VAT (12%)</span><b>{money(tax)}</b></div><div className="total-line"><span>Total</span><strong>{money(total)}</strong></div><select value={payment} onChange={e => setPayment(e.target.value)}><option>Cash</option><option>GCash</option><option>Card</option></select>{payment === 'Cash' && cart.length > 0 && <label className="cash-field">Cash received<input inputMode="decimal" min="0" step="0.01" type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value)} placeholder="0.00" /></label>}{payment === 'Cash' && cart.length > 0 && <div className={cashReceived !== '' && change < 0 ? 'change-line short' : 'change-line'}><span>{cashReceived !== '' && change < 0 ? 'Short' : 'Change'}</span><strong>{cashReceived === '' ? money(0) : money(Math.abs(change))}</strong></div>}{message && <div className={message === 'Sale completed successfully.' ? 'success-message' : 'form-message'}>{message}</div>}<button className="primary-btn full" disabled={!cart.length || !cashReady} onClick={checkout}>Complete sale <CreditCard size={16} /></button></div></aside></div>;
}

function Inventory({ products, setProducts }: { products: Product[]; setProducts: (items: Product[]) => void }) {
  const emptyForm = { name: '', description: '', category: 'Coffee' as Category, temperature: 'Hot' as Temperature, size: '16 oz' as Size, price: '', quantity: '' };
  const [modal, setModal] = useState(false); const [editing, setEditing] = useState<Product | null>(null); const [search, setSearch] = useState(''); const [filter, setFilter] = useState<'All' | Category>('All'); const [form, setForm] = useState(emptyForm); const [imageFile, setImageFile] = useState<File | null>(null); const [preview, setPreview] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const visible = products.filter(p => (filter === 'All' || p.category === filter) && p.name.toLowerCase().includes(search.toLowerCase())); const stock = { total: products.length, ready: products.filter(p => p.quantity > 5).length, low: products.filter(p => p.quantity > 0 && p.quantity <= 5).length, out: products.filter(p => p.quantity === 0).length };
  const temperatures = temperatureOptions[form.category];
  const chooseCategory = (category: Category) => { const next = temperatureOptions[category]; setForm(current => ({ ...current, category, temperature: next.includes(current.temperature) ? current.temperature : next[0], size: category === 'Frappe' ? current.size : '16 oz' })); };
  const chooseImage = (file: File | null) => { setPreview(current => { if (current.startsWith('blob:')) URL.revokeObjectURL(current); return file ? URL.createObjectURL(file) : ''; }); setImageFile(file); };
  const resetForm = () => { setEditing(null); setForm(emptyForm); chooseImage(null); setError(''); };
  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({ name: product.name, description: product.description || '', category: product.category, temperature: product.temperature, size: product.size, price: String(product.price), quantity: String(product.quantity) });
    setPreview(current => { if (current.startsWith('blob:')) URL.revokeObjectURL(current); return product.image_url || ''; });
    setImageFile(null); setError(''); setModal(true);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSaving(true);
    let imageUrl: string | null = editing?.image_url ?? null;
    if (imageFile) {
      if (!imageFile.type.startsWith('image/')) { setError('Choose a photo file.'); setSaving(false); return; }
      if (imageFile.size > 5 * 1024 * 1024) { setError('Photo must be 5 MB or smaller.'); setSaving(false); return; }
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) { setError('Sign in again to upload a photo.'); setSaving(false); return; }
      const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, imageFile, { contentType: imageFile.type || 'image/jpeg' });
      if (uploadError) { setError(uploadError.message); setSaving(false); return; }
      imageUrl = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
    }
    const payload = { name: form.name.trim(), description: form.description.trim() || null, category: form.category, temperature: form.temperature, size: form.category === 'Frappe' ? form.size : '16 oz', image_url: imageUrl, price: Number(form.price), quantity: Number(form.quantity || 0) };
    const query = editing ? supabase.from('products').update(payload).eq('id', editing.id) : supabase.from('products').insert(payload);
    const { data, error: saveError } = await query.select().maybeSingle();
    setSaving(false);
    if (saveError || !data) { setError(saveError?.message || 'Unable to save product.'); return; }
    setProducts(editing ? products.map(item => item.id === data.id ? data as Product : item) : [data as Product, ...products]); resetForm(); setModal(false);
  };
  const remove = async (id: string) => { if (!window.confirm('Remove this product from your menu?')) return; const { error: removeError } = await supabase.from('products').delete().eq('id', id); if (!removeError) setProducts(products.filter(p => p.id !== id)); };
  return <div className="page-stack"><div className="page-intro"><div><span className="eyebrow">STOCK CONTROL</span><h2>Everything your bar needs.</h2><p className="muted">Add products here and they instantly appear in the POS.</p></div><button className="primary-btn" onClick={() => { resetForm(); setModal(true); }}><Plus size={18} /> Add product</button></div><div className="inventory-stats"><StatCard icon={<Box size={18} />} label="Total items" value={String(stock.total)} note="Across all categories" /><StatCard icon={<TrendingUp size={18} />} label="In stock" value={String(stock.ready)} note="Ready to sell" tone="green" /><StatCard icon={<TrendingUp size={18} />} label="Low stock" value={String(stock.low)} note="Restock soon" tone="gold" /><StatCard icon={<X size={18} />} label="Out of stock" value={String(stock.out)} note="Hidden from POS" tone="red" /></div><section className="panel inventory-panel"><div className="inventory-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." /></div><CategoryMenu value={filter} options={['All', ...categories]} onChange={value => setFilter(value as 'All' | Category)} /></div><div className="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Current stock</th><th>Status</th><th /></tr></thead><tbody>{visible.map(product => <tr key={product.id}><td><div className="table-product"><span className="product-thumb"><ProductMark product={product} /></span><span><strong>{product.name}</strong><small>{product.description || 'No description'}</small></span></div></td><td><div className="table-product"><span><strong>{product.category}</strong><small>{variantLabel(product)}</small></span></div></td><td>{money(Number(product.price))}</td><td>{product.quantity} units</td><td><span className={`badge ${product.quantity === 0 ? 'out' : product.quantity <= 5 ? 'low' : 'in'}`}>{product.quantity === 0 ? 'Out of stock' : product.quantity <= 5 ? 'Low stock' : 'In stock'}</span></td><td><div className="row-actions"><button className="edit-btn" type="button" aria-label={`Edit ${product.name}`} onClick={() => openEdit(product)}><Pencil size={16} /></button><button className="delete-btn" type="button" aria-label={`Remove ${product.name}`} onClick={() => remove(product.id)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table>{visible.length === 0 && <EmptyState text="No products match your search." />}</div></section>{modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) { resetForm(); setModal(false); } }}><div className="modal"><div className="modal-head"><div><span className="eyebrow">{editing ? 'UPDATE MENU ITEM' : 'NEW MENU ITEM'}</span><h2>{editing ? 'Edit product' : 'Add product'}</h2></div><button className="icon-btn" onClick={() => { resetForm(); setModal(false); }}><X size={20} /></button></div><form onSubmit={save}><label>Category<CategoryMenu value={form.category} options={categories} onChange={value => chooseCategory(value as Category)} /></label><label>{temperatures.length > 1 ? 'Hot or iced' : 'Temperature'}<div className="choice-row" role="group" aria-label="Temperature">{temperatures.map(option => <button type="button" key={option} className={form.temperature === option ? 'active' : ''} disabled={temperatures.length === 1} onClick={() => setForm({ ...form, temperature: option })}>{option}{temperatures.length === 1 ? ' · default' : ''}</button>)}</div></label>{form.category === 'Frappe' && <label>Size<div className="choice-row" role="group" aria-label="Size">{sizes.map(option => <button type="button" key={option} className={form.size === option ? 'active' : ''} onClick={() => setForm({ ...form, size: option })}>{option}</button>)}</div></label>}<label>Product name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Spanish Latte" /></label><label>Short description <span className="optional">optional</span><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="A little detail for your team..." rows={3} /></label><label className="image-field">Product photo <span className="optional">optional</span><span className="image-picker">{preview ? <img src={preview} alt="Selected product" /> : <span><ImagePlus size={22} /> Upload a photo</span>}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => chooseImage(e.target.files?.[0] ?? null)} /></span></label><div className="form-grid"><label>Price<input required min="0" step="0.01" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" /></label><label>Quantity <span className="optional">optional</span><input min="0" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0" /></label></div>{error && <div className="form-message">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => { resetForm(); setModal(false); }}>Cancel</button><button className="primary-btn" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Save product'} <ChevronRight size={16} /></button></div></form></div></div>}</div>;
}

function SalesAnalytics({ sales }: { sales: Sale[] }) { const revenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0); const average = sales.length ? revenue / sales.length : 0; const max = Math.max(...sales.slice(0, 7).map(s => Number(s.total)), 1); return <div className="page-stack"><div className="page-intro"><div><span className="eyebrow">BUSINESS PULSE</span><h2>Know what is working.</h2><p className="muted">A clear view of your recorded sales performance.</p></div><div className="date-chip">Last {Math.min(sales.length || 0, 30)} transactions</div></div><div className="stats-grid"><StatCard icon={<CreditCard size={19} />} label="Total revenue" value={money(revenue)} note="Across recorded orders" /><StatCard icon={<ShoppingBag size={19} />} label="Transactions" value={String(sales.length)} note="Completed orders" tone="green" /><StatCard icon={<TrendingUp size={19} />} label="Average order" value={money(average)} note="Per transaction" tone="brown" /></div><div className="analytics-grid"><section className="panel chart-panel"><div className="section-heading"><div><span className="eyebrow">REVENUE TREND</span><h3>Recent transactions</h3></div></div>{sales.length === 0 ? <EmptyState text="Complete your first POS sale to see a trend here." /> : <div className="bars">{sales.slice(0, 7).reverse().map((sale, index) => <div className="bar-group" key={sale.id}><div className="bar" style={{ height: `${Math.max(12, Number(sale.total) / max * 100)}%` }} title={money(Number(sale.total))} /><small>{index + 1}</small></div>)}</div>}</section><section className="panel"><div className="section-heading"><div><span className="eyebrow">RECENT SALES</span><h3>Latest orders</h3></div></div><div className="sales-list">{sales.slice(0, 6).map(sale => <div className="sale-row" key={sale.id}><span className="product-thumb"><CreditCard size={16} /></span><span><strong>{new Date(sale.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</strong><small>{sale.payment_method} · {new Date(sale.created_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</small></span><b>{money(Number(sale.total))}</b></div>)}{!sales.length && <EmptyState text="No sales yet." />}</div></section></div></div>; }
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
