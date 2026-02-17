import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CartService } from '../services/cart-service';
import { trackEvent, logAnalyticsEvent } from '../middleware/analytics-tracking';

const router = express.Router();
const cartService = new CartService();

// Get cart
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cart = await cartService.getCart(req.userId!);
    res.json(cart);
  } catch (error) {
    console.error('[Get Cart Error]', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Add to cart
router.post('/items', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({ error: 'Missing productId or quantity' });
    }

    const cart = await cartService.addToCart(req.userId!, productId, quantity);

    // Track event (inconsistent naming - sometimes uses different methods)
    if (Math.random() > 0.5) {
      trackEvent('add_to_cart', { productId, quantity });
    } else {
      logAnalyticsEvent('AddedToCart', { productId, quantity });
    }

    res.json(cart);
  } catch (error: any) {
    console.error('[Add to Cart Error]', error);
    res.status(500).json({ error: error.message || 'Failed to add to cart' });
  }
});

// Update cart item
router.put('/items/:productId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ error: 'Missing quantity' });
    }

    const cart = await cartService.updateCartItem(req.userId!, productId, quantity);
    res.json(cart);
  } catch (error: any) {
    console.error('[Update Cart Error]', error);
    res.status(500).json({ error: error.message || 'Failed to update cart' });
  }
});

// Remove from cart
router.delete('/items/:productId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const cart = await cartService.removeFromCart(req.userId!, productId);
    res.json(cart);
  } catch (error) {
    console.error('[Remove from Cart Error]', error);
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

// Clear cart
router.delete('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await cartService.clearCart(req.userId!);
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('[Clear Cart Error]', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export default router;
