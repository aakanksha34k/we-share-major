// One badge used everywhere (cards, detail page, dashboards, admin) so "for sale" and
// "for lending" always look the same.
//   <TypeBadge type="sell" />  or  type="purchase"  -> For sale
//   <TypeBadge type="lend" />  or  type="borrow"    -> For lending
export const isSaleType = (type) => type === 'sell' || type === 'purchase';

export default function TypeBadge({ type, className = '' }) {
  const sale = isSaleType(type);
  return (
    <span className={`type-badge type-badge--${sale ? 'sell' : 'lend'} ${className}`}>
      {sale ? '🏷️ For sale' : '🔄 For lending'}
    </span>
  );
}
