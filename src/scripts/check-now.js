import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { checkNow } from '../services.js';

const prisma = new PrismaClient();
const id = Number(process.argv[2]);
if (!id) {
  console.error('Usage: npm run check-now -- <itemId>');
  process.exit(1);
}
checkNow(prisma, id).then((r) => { console.log(r); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
