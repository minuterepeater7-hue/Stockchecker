import express from 'express';
import { createItem, listItems, deleteItem, checkNow, listNotifications } from './services.js';

export default function routes(prisma) {
  const router = express.Router();

  router.post('/items', async (req, res) => {
    try {
      const { url, email, frequency } = req.body || {};
      if (!url) return res.status(400).json({ error: 'url required' });
      const item = await createItem(prisma, { url, email, frequency });
      res.json({ ok: true, item });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  router.get('/items', async (_req, res) => {
    const items = await listItems(prisma);
    res.json({ ok: true, items });
  });

  router.delete('/items/:id', async (req, res) => {
    try {
      await deleteItem(prisma, Number(req.params.id));
      res.json({ ok: true });
    } catch (e) {
      res.status(404).json({ error: 'not_found' });
    }
  });

  router.post('/check-now/:id', async (req, res) => {
    try {
      const result = await checkNow(prisma, Number(req.params.id));
      res.json({ ok: true, result });
    } catch (e) {
      res.status(400).json({ error: e?.message || 'check_failed' });
    }
  });

  router.get('/notifications', async (_req, res) => {
    const items = await listNotifications(prisma);
    res.json({ ok: true, items });
  });

  return router;
}
