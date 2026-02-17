import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Logger } from '@marketplace/shared';
import { PricingService } from './services/pricing-service';
import { InventoryService } from './services/inventory-service';

const logger = new Logger('Pricing Service');
const app: Express = express();
const PORT = process.env.PORT || 3003;

const pricingService = new PricingService();
const inventoryService = new InventoryService();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'pricing-service', timestamp: new Date().toISOString() });
});

// Pricing endpoints
app.get('/api/pricing/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const price = await pricingService.getPrice(productId);
    res.json(price);
  } catch (error: any) {
    console.error('[Get Price Error]', error);
    res.status(500).json({ error: error.message || 'Failed to get price' });
  }
});

app.post('/api/pricing/:productId/calculate', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const price = await pricingService.calculatePrice(productId, quantity);
    res.json(price);
  } catch (error: any) {
    console.error('[Calculate Price Error]', error);
    res.status(500).json({ error: error.message || 'Failed to calculate price' });
  }
});

// Inventory endpoints
app.get('/api/inventory/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const inventory = await inventoryService.getInventory(productId);
    res.json(inventory);
  } catch (error: any) {
    console.error('[Get Inventory Error]', error);
    res.status(500).json({ error: error.message || 'Failed to get inventory' });
  }
});

app.post('/api/inventory/:productId/reserve', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    const success = await inventoryService.reserveStock(productId, quantity);
    if (!success) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    res.json({ message: 'Stock reserved', productId, quantity });
  } catch (error: any) {
    console.error('[Reserve Stock Error]', error);
    res.status(500).json({ error: error.message || 'Failed to reserve stock' });
  }
});

app.post('/api/inventory/:productId/release', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    await inventoryService.releaseStock(productId, quantity);
    res.json({ message: 'Stock released', productId, quantity });
  } catch (error: any) {
    console.error('[Release Stock Error]', error);
    res.status(500).json({ error: error.message || 'Failed to release stock' });
  }
});

// Sync inventory (called by core-api)
app.post('/api/inventory/sync', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    console.log('[Pricing Service] Syncing inventory for order:', orderId);
    // TODO: Implement actual sync logic
    res.json({ message: 'Sync queued' });
  } catch (error) {
    console.error('[Sync Error]', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error('Request error', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Pricing service running on port ${PORT}`);
  console.log(`💰 Pricing Service listening at http://localhost:${PORT}`);
});

export default app;
