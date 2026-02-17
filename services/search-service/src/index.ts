import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Logger } from '@marketplace/shared';
import { searchController } from './controllers/search-controller';

const logger = new Logger('Search Service');
const app: Express = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'search-service', timestamp: new Date().toISOString() });
});

// Search endpoints
app.get('/api/search', searchController.search);
app.post('/api/search/index', searchController.indexProducts);
app.post('/api/search/index/:productId', searchController.indexProduct);

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
  logger.info(`Search service running on port ${PORT}`);
  console.log(`🔍 Search Service listening at http://localhost:${PORT}`);
});

export default app;
