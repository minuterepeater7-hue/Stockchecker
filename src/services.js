import axios from 'axios';
import nodemailer from 'nodemailer';

export async function createItem(prisma, { url, email, frequency }) {
  // Free tier: always use 15-minute checks regardless of client input
  const freq = normalizeFrequency(frequency);
  return prisma.item.create({ data: { url, email, frequency: freq, status: 'CHECKING' } });
}

export async function listItems(prisma) {
  return prisma.item.findMany({ orderBy: { updatedAt: 'desc' } });
}

export async function deleteItem(prisma, id) {
  await prisma.notification.deleteMany({ where: { itemId: id } });
  return prisma.item.delete({ where: { id } });
}

export async function listNotifications(prisma) {
  return prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { item: true } });
}

export function normalizeFrequency(f) {
  // Enforce MIN_15 for all items on the free service
  return 'MIN_15';
}

export async function checkNow(prisma, id) {
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) throw new Error('item_not_found');
  const status = await checkStock(item.url);
  const wasInStock = item.status === 'IN_STOCK';
  const isInStock = status.inStock === true;

  await prisma.item.update({
    where: { id },
    data: {
      status: isInStock ? 'IN_STOCK' : 'OUT_OF_STOCK',
      title: status.meta?.title,
      image: status.meta?.image,
      site: status.meta?.site,
      lastCheckedAt: new Date(),
    },
  });

  if (!wasInStock && isInStock) {
    const message = `${status.meta?.title || item.url} — Back in stock`;
    await prisma.notification.create({ data: { itemId: item.id, type: 'back_in_stock', message } });
    if (item.email) await sendEmail({ to: item.email, subject: 'Back in stock', text: `${message}\n${item.url}` });
  }

  return { id, ...status };
}

export async function checkStock(url) {
  // Shopify-first strategy
  try {
    const shopifyJson = await tryShopify(url);
    if (shopifyJson) {
      const product = shopifyJson?.product || {};
      const variants = product?.variants || [];
      // Some shops omit `available`; use multiple signals
      const inStockByAvailable = variants.some(v => v?.available === true);
      const inStockByQty = variants.some(v => (v?.inventory_quantity ?? 0) > 0);
      const inStockByBody = /in stock/i.test(product?.body_html || '');
      const inStock = inStockByAvailable || inStockByQty || inStockByBody;
      return {
        inStock,
        meta: {
          title: product?.title,
          image: product?.images?.[0]?.src,
          site: 'shopify',
        },
      };
    }
  } catch (_) {}

  // Fallback: simple HTML heuristic
  const html = (await axios.get(url, { timeout: 15000 })).data || '';
  const lc = String(html).toLowerCase();
  const inStock = lc.includes('add to cart') || lc.includes('in stock');
  const title = (/\<title\>(.*?)\<\/title\>/i.exec(html)?.[1] || '').trim();
  return { inStock, meta: { title: title || url, site: 'html' } };
}

async function tryShopify(url) {
  const m = /https?:\/\/[^\/]+\/products\/([^\?\#]+)/i.exec(url);
  if (!m) return null;
  const handle = m[1];
  const shopBase = url.split('/products/')[0];
  const apiUrl = `${shopBase}/products/${handle}.json`;
  const { data } = await axios.get(apiUrl, { timeout: 15000, headers: { 'Accept': 'application/json' } });
  return data;
}

export async function sendEmail({ to, subject, text }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to, subject, text });
}
