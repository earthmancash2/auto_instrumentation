export interface Cart {
  userId: string;
  items: CartItem[];
  subtotal: number;
  updatedAt: Date;
}

export interface CartItem {
  productId: string;
  productTitle: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  addedAt: Date;
}

export interface AddToCartData {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemData {
  productId: string;
  quantity: number;
}
