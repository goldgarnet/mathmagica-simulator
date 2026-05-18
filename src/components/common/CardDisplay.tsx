import type { Card, EquipmentDef } from '../../types';

const ELEMENT_COLORS: Record<string, string> = {
  life: 'border-element-life text-element-life',
  fire: 'border-element-fire text-element-fire',
  air: 'border-element-air text-element-air',
  water: 'border-element-water text-element-water',
  earth: 'border-element-earth text-element-earth',
  lightning: 'border-element-lightning text-element-lightning',
  void: 'border-element-void text-element-void',
  light: 'border-element-light text-element-light',
};

const ELEMENT_BG: Record<string, string> = {
  life: 'bg-element-life/15',
  fire: 'bg-element-fire/15',
  air: 'bg-element-air/15',
  water: 'bg-element-water/15',
  earth: 'bg-element-earth/15',
  lightning: 'bg-element-lightning/15',
  void: 'bg-element-void/15',
  light: 'bg-element-light/15',
};

const RARITY_BORDER: Record<string, string> = {
  common: 'border-rarity-common',
  rare: 'border-rarity-rare',
  epic: 'border-rarity-epic',
  legendary: 'border-rarity-legendary',
};

function PowerStars({ count }: { count: number }) {
  return (
    <span className="text-accent-gold text-xs">
      {'★'.repeat(count)}
    </span>
  );
}

interface CardDisplayProps {
  card: Card;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  selected?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  className?: string;
}

export function CardDisplay({ card, size = 'md', onClick, selected, draggable, onDragStart, className = '' }: CardDisplayProps) {
  const sizeClasses = {
    sm: 'w-14 h-20 text-xs',
    md: 'w-20 h-28 text-sm',
    lg: 'w-28 h-40 text-base',
  };

  if (card.cardType === 'element') {
    const colorClass = ELEMENT_COLORS[card.elementName] || '';
    const bgClass = ELEMENT_BG[card.elementName] || '';
    return (
      <div
        className={`${sizeClasses[size]} ${bgClass} border-2 ${colorClass} rounded-lg flex flex-col items-center justify-center cursor-pointer hover:brightness-125 transition-all ${
          selected ? 'ring-2 ring-accent-gold scale-105' : ''
        } ${className}`}
        onClick={onClick}
        draggable={draggable}
        onDragStart={onDragStart}
      >
        <span className="text-2xl font-bold">{card.value}</span>
        <PowerStars count={card.power} />
        <span className="text-[10px] mt-1 opacity-70">{card.name}</span>
      </div>
    );
  }

  if (card.cardType === 'rune') {
    return (
      <div
        className={`${sizeClasses[size]} bg-accent-purple/15 border-2 border-accent-purple rounded-lg flex flex-col items-center justify-center cursor-pointer hover:brightness-125 transition-all ${
          selected ? 'ring-2 ring-accent-gold scale-105' : ''
        } ${className}`}
        onClick={onClick}
        draggable={draggable}
        onDragStart={onDragStart}
      >
        <span className="text-3xl font-bold text-accent-purple">
          {card.symbol === '*' ? '×' : card.symbol}
        </span>
        <span className="text-[10px] mt-1 opacity-70">{card.name}</span>
      </div>
    );
  }

  // Artifact
  const art = card;
  const rarityBorder = RARITY_BORDER[art.rarity] || '';
  return (
    <div
      className={`${sizeClasses[size]} bg-bg-card border-2 ${rarityBorder} rounded-lg flex flex-col items-center justify-center cursor-pointer hover:brightness-125 transition-all p-1 ${
        selected ? 'ring-2 ring-accent-gold scale-105' : ''
      } ${className}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      {art.value !== undefined && (
        <span className="text-lg font-bold text-text-primary">{art.value}</span>
      )}
      {art.symbol && (
        <span className="text-lg font-bold text-accent-purple">
          {art.symbol === '*' ? '×' : art.symbol}
        </span>
      )}
      <PowerStars count={art.power} />
      <span className="text-[9px] text-center leading-tight mt-1 text-text-secondary line-clamp-2">
        {art.name}
      </span>
    </div>
  );
}

interface EquipmentDisplayProps {
  equipment: EquipmentDef;
  size?: 'sm' | 'md';
  onClick?: () => void;
  selected?: boolean;
}

export function EquipmentDisplay({ equipment, size = 'md', onClick, selected }: EquipmentDisplayProps) {
  const rarityBorder = RARITY_BORDER[equipment.rarity] || '';
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm';

  const slotIcons: Record<string, string> = {
    hat: '🎩',
    robe: '🧥',
    leftHand: '🛡️',
    rightHand: '🪄',
    accessory: '💍',
  };

  return (
    <div
      className={`${sizeClasses} bg-bg-card border ${rarityBorder} rounded-lg cursor-pointer hover:brightness-125 transition-all flex items-center gap-2 ${
        selected ? 'ring-2 ring-accent-gold' : ''
      }`}
      onClick={onClick}
    >
      <span>{slotIcons[equipment.slot] || '⚙️'}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-text-primary truncate">{equipment.name}</div>
        <div className="text-[10px] text-text-muted truncate">{equipment.effectDescription}</div>
      </div>
    </div>
  );
}

interface CardTooltipProps {
  card: Card;
}

export function CardTooltip({ card }: CardTooltipProps) {
  return (
    <div className="bg-bg-secondary border border-border rounded-lg p-3 shadow-xl max-w-64 z-50">
      <div className="font-bold text-text-primary mb-1">{card.name}</div>
      <div className="text-xs text-text-secondary space-y-1">
        {card.cardType === 'element' && (
          <>
            <div>원소: {card.elementName} | 값: {card.value}</div>
            <div>파워: <PowerStars count={card.power} /></div>
          </>
        )}
        {card.cardType === 'rune' && (
          <div>연산기호: {card.symbol === '*' ? '×' : card.symbol}</div>
        )}
        {card.cardType === 'artifact' && (
          <>
            {card.value !== undefined && <div>값: {card.value}</div>}
            {card.symbol && <div>기호: {card.symbol === '*' ? '×' : card.symbol}</div>}
            <div>파워: <PowerStars count={card.power} /></div>
            <div>등급: {card.rarity}</div>
            <div className="mt-1 text-text-primary">{card.effectDescription}</div>
            {card.versatile && <div className="text-accent-green">다용도</div>}
          </>
        )}
      </div>
    </div>
  );
}
