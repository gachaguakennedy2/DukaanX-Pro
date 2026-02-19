import type { Product, Unit } from '../types/schema';
import { Package } from 'lucide-react';

type Props = {
    product: Product;
    onClick?: () => void;
    actionLabel?: string;
    onAction?: (unit: Unit) => void;
};

export default function ProductCard({ product, onClick, actionLabel, onAction }: Props) {
    const unitBadges = product.sellingUnits;
    const showBagInfo = unitBadges.includes('BAG') && product.bagSizeKg;

    const handleAction = (unit: Unit) => {
        onAction?.(unit);
    };

    return (
        <div
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : -1}
            onClick={onClick}
            onKeyDown={(e) => {
                if (!onClick) return;
                if (e.key === 'Enter' || e.key === ' ') onClick();
            }}
            className={`bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-orange-50 text-[hsl(var(--color-secondary))] rounded-lg">
                        <Package size={18} />
                    </div>
                    <div className="min-w-0">
                        <div className="font-bold text-gray-800 truncate">{product.name}</div>
                        <div className="text-xs text-gray-400 uppercase truncate">{product.categoryId}</div>
                    </div>
                </div>

                <div className="text-right shrink-0">
                    <div className="text-[10px] text-gray-400">Price</div>
                    <div className="font-bold text-[hsl(var(--color-primary))]">
                        ${product.pricePerKg.toFixed(2)}
                    </div>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
                {unitBadges.map((u) => (
                    <span key={u} className="px-2 py-0.5 text-xs rounded-full border border-gray-200 text-gray-600">
                        {u}{u === 'BAG' && showBagInfo ? ` (${product.bagSizeKg}kg)` : ''}
                    </span>
                ))}
                {!product.isActive && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">INACTIVE</span>
                )}
            </div>

            {actionLabel && onAction && (
                <div className="mt-4 flex gap-2">
                    {product.sellingUnits.slice(0, 2).map((u) => (
                        <button
                            key={u}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAction(u);
                            }}
                            className="flex-1 py-2 rounded-lg bg-[hsl(var(--color-text))] text-white text-sm font-bold hover:bg-black transition-colors"
                        >
                            {actionLabel} ({u})
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
