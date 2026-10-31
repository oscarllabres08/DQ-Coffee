import { supabase } from '@/lib/supabase';

type MenuItem = {
  name: string;
  category: 'Coffee' | 'Non Coffee' | 'Matcha Series' | 'Frappe' | 'Sparkling Series' | 'Tea Infusion' | 'Specialty hot coffee';
  temperature: 'Hot' | 'Iced';
  size: '16 oz' | '22 oz';
  price: number;
};

const STARTING_STOCK = 20;

const drink = (name: string, category: MenuItem['category'], hot: number | null, iced: number | null, size: MenuItem['size'] = '16 oz'): MenuItem[] => {
  const items: MenuItem[] = [];
  if (hot !== null) items.push({ name, category, temperature: 'Hot', size, price: hot });
  if (iced !== null) items.push({ name, category, temperature: 'Iced', size, price: iced });
  return items;
};

const frappe = (name: string, ounce16: number, ounce22: number): MenuItem[] => [
  { name, category: 'Frappe', temperature: 'Iced', size: '16 oz', price: ounce16 },
  { name, category: 'Frappe', temperature: 'Iced', size: '22 oz', price: ounce22 },
];

const iced = (name: string, category: MenuItem['category'], price: number): MenuItem => ({ name, category, temperature: 'Iced', size: '16 oz', price });

export const menuSeed: MenuItem[] = [
  ...drink('Sweet Americano', 'Coffee', 99, 109),
  ...drink('Cloud Americano', 'Coffee', 119, 129),
  ...drink('Orange Espresso', 'Coffee', 129, 139),
  ...drink('Spanish Latte', 'Coffee', 139, 149),
  ...drink('Seasalt Latte', 'Coffee', 150, 160),
  ...drink('Caramel Macchiato', 'Coffee', 150, 160),
  ...drink('Biscoff Latte', 'Coffee', 165, 180),
  ...drink('White Mocha', 'Coffee', 150, 160),
  ...drink('Cafe Latte', 'Coffee', 130, 140),
  ...drink('Hazelnut Latte', 'Coffee', 140, 150),
  ...drink('Brown Sugar Shaken Coffee', 'Coffee', 140, 160),

  iced('Mango Cloud', 'Non Coffee', 150),
  iced('Strawberry Cloud', 'Non Coffee', 150),
  iced('Berry Cloud', 'Non Coffee', 150),
  iced('Ube Cloud', 'Non Coffee', 170),
  iced('Biscoff Cloud', 'Non Coffee', 170),
  iced('Choco Loco', 'Non Coffee', 150),
  iced('White Chocolate Cloud', 'Non Coffee', 150),

  ...drink('Milky Matcha', 'Matcha Series', 160, 170),
  ...drink('Strawberry Matcha', 'Matcha Series', null, 170),
  ...drink('Seasalt Matcha', 'Matcha Series', 165, 180),
  ...drink('Dirty Matcha', 'Matcha Series', 130, 150),
  ...drink('Coconut Matcha', 'Matcha Series', null, 180),

  ...frappe('Oreo Tiramisu', 190, 220),
  ...frappe('Matcha Crunch', 180, 200),
  ...frappe('Black Forest', 220, 240),
  ...frappe('Pretzel Crunch', 220, 240),
  ...frappe('Java Chip', 170, 190),
  ...frappe("S'mores", 220, 240),
  ...frappe('Berde', 175, 190),
  ...frappe('Strawberries & Cream', 175, 190),
  ...frappe('Cookie Monster', 175, 190),
  ...frappe('Double Fudge Mocha', 190, 220),
  ...frappe('Salted Vanilla', 170, 190),
  ...frappe('Nutella Oreo Milkshake', 220, 240),
  ...frappe('Banana Peanut Butter Shake', 220, 240),
  ...frappe('Caramel Macchiato Shake', 170, 190),
  ...frappe('Pistachio Milkshake', 190, 220),

  iced('Sunset (Strawberry)', 'Sparkling Series', 140),
  iced('Sunrise (Peach)', 'Sparkling Series', 140),
  iced('Midnight (Blueberry)', 'Sparkling Series', 140),
  iced('Mojito (Blueberry/Strawberry)', 'Sparkling Series', 140),

  iced('Strawberry Hibiscus Tea', 'Tea Infusion', 160),
  iced('Honey Lemon Tea', 'Tea Infusion', 160),

  { name: 'Espresso', category: 'Specialty hot coffee', temperature: 'Hot', size: '16 oz', price: 140 },
  { name: 'Cappuccino', category: 'Specialty hot coffee', temperature: 'Hot', size: '16 oz', price: 150 },
  { name: 'Flat White', category: 'Specialty hot coffee', temperature: 'Hot', size: '16 oz', price: 150 },
];

const itemKey = (item: Pick<MenuItem, 'name' | 'temperature' | 'size'>) => `${item.name}|${item.temperature}|${item.size}`;

async function removeDuplicates(rows: { id: string; name: string; temperature: string; size: string }[]) {
  const seen = new Set<string>();
  const extra: string[] = [];
  rows.forEach(row => {
    const key = itemKey(row);
    if (seen.has(key)) extra.push(row.id);
    else seen.add(key);
  });
  for (let index = 0; index < extra.length; index += 40) {
    await supabase.from('products').delete().in('id', extra.slice(index, index + 40));
  }
}

let syncing: Promise<void> | null = null;

async function syncMenu() {
  const { data, error } = await supabase.from('products').select('id, name, temperature, size').order('created_at', { ascending: true });
  if (error || !data) return;
  await removeDuplicates(data);
  const existing = new Set<string>();
  data.forEach(row => existing.add(itemKey(row)));
  const missing = menuSeed.filter(item => !existing.has(itemKey(item)));
  if (!missing.length) return;
  const rows = missing.map(item => ({ ...item, description: null, image_url: null, quantity: STARTING_STOCK }));
  const { error: insertError } = await supabase.from('products').insert(rows);
  if (!insertError) return;
  for (const row of rows) await supabase.from('products').insert(row);
}

export function ensureMenu() {
  if (!syncing) syncing = syncMenu().finally(() => { syncing = null; });
  return syncing;
}
