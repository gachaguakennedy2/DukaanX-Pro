import type { Product } from '../types/schema';

// Shared mock catalog for Sprint builds.
// Notes:
// - `pricePerKg` is treated as "price per base unit" (KG or PCS).
// - For `BAG`, we compute bag price = pricePerKg * bagSizeKg.
// - Inventory still stores a single numeric stock field; for PCS items it represents piece count.
export const MOCK_PRODUCTS: Product[] = [
    // Staples (existing IDs kept for inventory seeding)
    { id: '1', name: 'Bariis', categoryId: 'grains', image: '🍚', baseUnit: 'KG', sellingUnits: ['KG', 'BAG'], bagSizeKg: 50, pricePerKg: 1.2, costPerKg: 1.0, isActive: true },
    { id: '2', name: 'Sonkor', categoryId: 'grains', image: '🧂', baseUnit: 'KG', sellingUnits: ['KG', 'BAG'], bagSizeKg: 50, pricePerKg: 0.9, costPerKg: 0.8, isActive: true },
    { id: '3', name: 'Bur', categoryId: 'grains', image: '🌾', baseUnit: 'KG', sellingUnits: ['KG', 'BAG'], bagSizeKg: 25, pricePerKg: 0.6, costPerKg: 0.5, isActive: true },

    // Produce
    { id: '5', name: 'Basiir', categoryId: 'produce', image: '🧅', baseUnit: 'KG', sellingUnits: ['KG'], pricePerKg: 0.7, costPerKg: 0.5, isActive: true },
    { id: '6', name: 'Caleen', categoryId: 'produce', image: '🥬', baseUnit: 'KG', sellingUnits: ['KG'], pricePerKg: 0.9, costPerKg: 0.6, isActive: true },

    // Pantry
    { id: '7', name: 'Baasto', categoryId: 'pantry', image: '🍝', baseUnit: 'KG', sellingUnits: ['KG'], pricePerKg: 0.75, costPerKg: 0.55, isActive: true },
    { id: '8', name: 'Bariis 5kg', categoryId: 'grains', image: '🍚', baseUnit: 'PCS', sellingUnits: ['PCS'], pricePerKg: 6.0, costPerKg: 5.2, isActive: true },

    // Dairy
    { id: '9', name: 'Caano 1L', categoryId: 'dairy', image: '🥛', baseUnit: 'PCS', sellingUnits: ['PCS'], pricePerKg: 1.1, costPerKg: 0.9, isActive: true },
    { id: '10', name: 'Subag 1L', categoryId: 'dairy', image: '🧈', baseUnit: 'PCS', sellingUnits: ['PCS'], pricePerKg: 3.5, costPerKg: 3.0, isActive: true },

    // Beverages
    { id: '11', name: 'Biyo 1.5L', categoryId: 'beverages', image: '💧', baseUnit: 'PCS', sellingUnits: ['PCS'], pricePerKg: 0.5, costPerKg: 0.3, isActive: true },
    { id: '12', name: 'Cabitaan 330ml', categoryId: 'beverages', image: '🥤', baseUnit: 'PCS', sellingUnits: ['PCS'], pricePerKg: 0.6, costPerKg: 0.4, isActive: true },

    // Cooking oil
    { id: '4', name: 'Saliid 1L', categoryId: 'oil', image: '🫒', baseUnit: 'PCS', sellingUnits: ['PCS'], pricePerKg: 5.0, costPerKg: 4.5, isActive: true },

    // Hygiene / Personal care
    { id: '13', name: 'Saabuun', categoryId: 'hygiene', image: '🧼', baseUnit: 'PCS', sellingUnits: ['PCS'], pricePerKg: 0.4, costPerKg: 0.25, isActive: true },
    { id: '14', name: 'Shaambo Yar', categoryId: 'hygiene', image: '🧴', baseUnit: 'PCS', sellingUnits: ['PCS'], pricePerKg: 1.2, costPerKg: 0.9, isActive: true },
    { id: '15', name: 'Shaambo Weyn', categoryId: 'hygiene', image: '🧴', baseUnit: 'PCS', sellingUnits: ['PCS'], pricePerKg: 2.2, costPerKg: 1.7, isActive: true },
    { id: '16', name: 'Cream Jirka', categoryId: 'hygiene', image: '🧴', baseUnit: 'PCS', sellingUnits: ['PCS'], pricePerKg: 1.8, costPerKg: 1.3, isActive: true },

    // Cleaning / Household
    { id: '17', name: 'Saabuunta Weelka', categoryId: 'cleaning', image: '🫧', baseUnit: 'PCS', sellingUnits: ['PCS'], pricePerKg: 1.0, costPerKg: 0.7, isActive: true },
    { id: '18', name: 'Jik 1L', categoryId: 'cleaning', image: '🧪', baseUnit: 'PCS', sellingUnits: ['PCS'], pricePerKg: 0.9, costPerKg: 0.6, isActive: true },
    { id: '19', name: 'Omo 1kg', categoryId: 'cleaning', image: '🫧', baseUnit: 'PCS', sellingUnits: ['PCS'], pricePerKg: 2.0, costPerKg: 1.6, isActive: true },
    { id: '20', name: 'Warqad Musqul', categoryId: 'toiletries', image: '🧻', baseUnit: 'PCS', sellingUnits: ['PCS'], pricePerKg: 1.4, costPerKg: 1.0, isActive: true },
];

export function formatUnitPrice(product: Product, unit: Product['baseUnit'] | 'BAG') {
    if (unit === 'KG') return `$${product.pricePerKg.toFixed(2)} / kg`;
    if (unit === 'PCS') return `$${product.pricePerKg.toFixed(2)} / pcs`;
    // BAG
    return `$${(product.pricePerKg * (product.bagSizeKg || 1)).toFixed(2)} / bag`;
}
