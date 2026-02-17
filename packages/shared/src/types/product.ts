export interface Product {
  id: string;
  sellerId: string;
  title: string;
  description?: string; // Intentionally optional - some products missing
  price: number; // Some may be negative (bad data)
  currency: string;
  category: string;
  tags: string[];
  imageUrl?: string;
  stock: number;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
  // Legacy fields
  oldPrice?: number;
  legacyCategoryId?: number;
}

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  OUT_OF_STOCK = 'out_of_stock',
  ARCHIVED = 'archived',
  DELETED = 'deleted', // Soft delete
}

export interface ProductSearchQuery {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  sellerId?: string;
  status?: ProductStatus;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'createdAt' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductSearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CreateProductData {
  title: string;
  description?: string;
  price: number;
  currency: string;
  category: string;
  tags: string[];
  imageUrl?: string;
  stock: number;
}

export interface UpdateProductData extends Partial<CreateProductData> {
  status?: ProductStatus;
}
