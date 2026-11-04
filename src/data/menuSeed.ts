import { supabase } from '@/lib/supabase';

type MenuGroup = 'Food' | 'Beverages';
type Subcategory = 'Coffee' | 'Non Coffee' | 'Matcha Series' | 'Frappe' | 'Sparkling Series' | 'Tea Infusion' | 'Specialty hot coffee' | 'Breakfast' | 'Pasta' | 'Snacks' | 'Waffles' | 'Pastries' | 'Cakes' | 'Korean Dish' | 'Fries';

type MenuItem = {
  name: string;
  category: MenuGroup;
  subcategory: Subcategory;
  temperature: 'Hot' | 'Iced' | 'None';
  size: '16 oz' | '22 oz' | 'Regular' | '6 pcs' | '12 pcs';
  price: number;
};

const STARTING_STOCK = 20;

const drink = (name: string, subcategory: Subcategory, hot: number | null, iced: number | null, size: MenuItem['size'] = '16 oz'): MenuItem[] => {
  const items: MenuItem[] = [];
  if (hot !== null) items.push({ name, category: 'Beverages', subcategory, temperature: 'Hot', size, price: hot });
  if (iced !== null) items.push({ name, category: 'Beverages', subcategory, temperature: 'Iced', size, price: iced });
  return items;
};

const frappe = (name: string, ounce16: number, ounce22: number): MenuItem[] => [
  { name, category: 'Beverages', subcategory: 'Frappe', temperature: 'Iced', size: '16 oz', price: ounce16 },
  { name, category: 'Beverages', subcategory: 'Frappe', temperature: 'Iced', size: '22 oz', price: ounce22 },
];

const iced = (name: string, subcategory: Subcategory, price: number): MenuItem => ({ name, category: 'Beverages', subcategory, temperature: 'Iced', size: '16 oz', price });

const food = (name: string, subcategory: Subcategory, price: number, size: MenuItem['size'] = 'Regular'): MenuItem => ({
  name, category: 'Food', subcategory, temperature: 'None', size, price,
});

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

  { name: 'Espresso', category: 'Beverages', subcategory: 'Specialty hot coffee', temperature: 'Hot', size: '16 oz', price: 140 },
  { name: 'Cappuccino', category: 'Beverages', subcategory: 'Specialty hot coffee', temperature: 'Hot', size: '16 oz', price: 150 },
  { name: 'Flat White', category: 'Beverages', subcategory: 'Specialty hot coffee', temperature: 'Hot', size: '16 oz', price: 150 },

  food('Hungarian Silog', 'Breakfast', 199),
  food('Tapsilog', 'Breakfast', 249),
  food('Spamsilog', 'Breakfast', 199),
  food('Sisig w/ Egg', 'Breakfast', 249),
  food('Chicken Fillet', 'Breakfast', 219),

  food('Creamy Chicken Alfredo', 'Pasta', 289),
  food('Aglio Pasta', 'Pasta', 289),
  food('Pesto Pasta', 'Pasta', 289),

  food('El Churros', 'Snacks', 75, '6 pcs'),
  food('El Churros', 'Snacks', 130, '12 pcs'),
  food('Beef Nachos', 'Snacks', 200),
  food('Chicken Poppers', 'Snacks', 160),

  food('Strawberry & Cream Waffle', 'Waffles', 160),
  food('Biscoff Crunch Waffle', 'Waffles', 170),
  food('Cookies & Cream Waffle', 'Waffles', 160),
  food('Nutella Almonds Waffle', 'Waffles', 170),

  food('Kimchi Fried Rice w/ Egg', 'Korean Dish', 199),
  food('Fishcake & Tteokbokki', 'Korean Dish', 149),

  food('Classic Fries', 'Fries', 120),
  food('BBQ Fries', 'Fries', 150),
  food('Sour Cream Fries', 'Fries', 150),
  food('Triple Cheese Fries', 'Fries', 150),
];

const itemKey = (item: { name: string; temperature: string; size: string }) => `${item.name}|${item.temperature}|${item.size}`;

async function removeDuplicates(rows: { id: string; name: string; temperature: string; size: string; image_url: string | null }[]) {
  const kept = new Map<string, { id: string; image_url: string | null }>();
  const extra: string[] = [];
  rows.forEach(row => {
    const key = itemKey(row);
    const current = kept.get(key);
    if (!current) { kept.set(key, row); return; }
    if (!current.image_url && row.image_url) { extra.push(current.id); kept.set(key, row); return; }
    extra.push(row.id);
  });
  for (let index = 0; index < extra.length; index += 40) {
    await supabase.from('products').delete().in('id', extra.slice(index, index + 40));
  }
}

let syncing: Promise<void> | null = null;

async function syncMenu() {
  const { data, error } = await supabase.from('products').select('id, name, temperature, size, image_url').order('created_at', { ascending: true });
  if (error || !data) return;
  // A shop that already has a menu keeps deletions. Refilling "missing" seed items
  // put removed foods and drinks back on every refresh, without their photos.
  if (data.length > 0) {
    await removeDuplicates(data);
    return;
  }
  const rows = menuSeed.map(item => ({ ...item, description: null, image_url: null, quantity: STARTING_STOCK }));
  const { error: insertError } = await supabase.from('products').insert(rows);
  if (!insertError) return;
  for (const row of rows) await supabase.from('products').insert(row);
}

export function ensureMenu() {
  if (!syncing) syncing = syncMenu().finally(() => { syncing = null; });
  return syncing;
}
