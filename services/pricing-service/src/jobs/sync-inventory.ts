import { InventoryService } from '../services/inventory-service';

/**
 * Background job to sync inventory
 * TODO: Make this run asynchronously with a job queue
 * Currently runs on interval (basic implementation)
 */
const inventoryService = new InventoryService();

async function runSync() {
  try {
    console.log('[Sync Job] Running inventory sync...');
    await inventoryService.syncInventory();
    console.log('[Sync Job] Sync completed');
  } catch (error) {
    console.error('[Sync Job] Sync failed:', error);
  }
}

// Run sync every 30 minutes
const SYNC_INTERVAL = 30 * 60 * 1000;

if (require.main === module) {
  console.log('[Sync Job] Starting inventory sync job...');
  runSync(); // Run immediately
  setInterval(runSync, SYNC_INTERVAL);
}

export { runSync };
