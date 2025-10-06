import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import routes from './routes.js';
import { startScheduler } from './scheduler.js';

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', routes(prisma));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
  startScheduler(prisma);
});
