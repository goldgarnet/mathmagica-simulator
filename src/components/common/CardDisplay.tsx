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

const ELEMENT_GRADIENTS: Record<string, string> = {
  life: 'from-element-life/30 via-element-life/10 to-transparent',
  fire: 'from-element-fire/40 via-element-fire/15 to-transparent',
  air: 'from-element-air/30 via-element-air/10 to-transparent',
  water: 'from-element-water/30 via-element-water/10 to-transparent',
  earth: 'from-element-earth/30 via-element-earth/10 to-transparent',
  lightning: 'from-element-lightning/40 via-element-lightning/15 to-transparent',
  void: 'from-element-void/40 via-element-void/15 to-transparent',
  light: 'from-element-light/30 via-element-light/10 to-transparent',
};

const ELEMENT_NAMES_KO: Record<string, string> = {
  life: '생명', fire: '불', air: '공기', water: '물',
  earth: '흙', lightning: '번개', void: '공허', light: '빛',
};

const RARITY_STYLES: Record<string, { border: string; glow: string; label: string }> = {
  common:     { border: 'border-rarity-common',    glow: '',                label: 'COMMON' },
  rare:       { border: 'border-rarity-rare',      glow: 'card-glow-blue',  label: 'RARE' },
  epic:       { border: 'border-rarity-epic',      glow: 'card-glow-purple',label: 'EPIC' },
  legendary:  { border: 'border-rarity-legendary', glow: 'card-glow-gold',  label: 'LEGENDARY' },
};

function PowerStars({ count, className = '' }: { count: number; className?: string }) {
  if (count === 0) return null;
  return (
    <span className={`text-accent-gold tracking-tighter text-shadow-glow ${className}`}>
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

// Card dimensions per size — keep aspect ratio so fonts scale together.
const SIZE_DIMS = {
  sm: { wrap: 'w-14 h-20', valueText: 'text-2xl', nameText: 'text-[8px]', starText: 'text-[10px]', symbolText: 'text-2xl', artifactName: 'text-[8px]', artifactValue: 'text-xl', artifactSymbol: 'text-xl' },
  md: { wrap: 'w-20 h-28', valueText: 'text-4xl', nameText: 'text-[10px]', starText: 'text-xs', symbolText: 'text-4xl', artifactName: 'text-[10px]', artifactValue: 'text-3xl', artifactSymbol: 'text-3xl' },
  lg: { wrap: 'w-28 h-40', valueText: 'text-5xl', nameText: 'text-xs', starText: 'text-sm', symbolText: 'text-5xl', artifactName: 'text-xs', artifactValue: 'text-4xl', artifactSymbol: 'text-4xl' },
};

export function CardDisplay({ card, size = 'md', onClick, selected, draggable, onDragStart, className = '' }: CardDisplayProps) {
  const dims = SIZE_DIMS[size];
  const baseInteract = `${onClick ? 'cursor-pointer' : ''} hover:brightness-125 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150`;
  const selectionRing = selected ? 'ring-2 ring-accent-gold scale-105 shadow-[0_0_20px_-2px_rgba(255,184,61,0.6)]' : '';

  // -------- Element card --------
  if (card.cardType === 'element') {
    const colorClass = ELEMENT_COLORS[card.elementName] || '';
    const gradientClass = ELEMENT_GRADIENTS[card.elementName] || '';
    const elemName = ELEMENT_NAMES_KO[card.elementName] || card.elementName;
    return (
      <div
        className={`card-frame ${dims.wrap} relative border-2 ${colorClass} rounded-lg overflow-hidden ${baseInteract} ${selectionRing} ${className}`}
        onClick={onClick}
        draggable={draggable}
        onDragStart={onDragStart}
        style={{ background: 'linear-gradient(to bottom, var(--color-bg-card), var(--color-bg-secondary))' }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`} />
        {/* Element tag at top */}
        <div className="absolute top-0 left-0 right-0 flex justify-center pt-0.5">
          <span className={`${dims.nameText} font-display uppercase tracking-widest ${colorClass.split(' ')[1]} opacity-80`}>
            {elemName}
          </span>
        </div>
        {/* Big numeric value */}
        <div className="absolute inset-0 flex items-center justify-center pt-1">
          <span className={`${dims.valueText} font-display font-bold ${colorClass.split(' ')[1]} text-shadow-glow leading-none`}>
            {card.value}
          </span>
        </div>
        {/* Power stars at bottom */}
        <div className="absolute bottom-0.5 left-0 right-0 flex justify-center">
          <PowerStars count={card.power} className={dims.starText} />
        </div>
      </div>
    );
  }

  // -------- Rune card --------
  if (card.cardType === 'rune') {
    return (
      <div
        className={`card-frame ${dims.wrap} relative border-2 border-accent-purple rounded-lg overflow-hidden ${baseInteract} ${selectionRing} ${className}`}
        onClick={onClick}
        draggable={draggable}
        onDragStart={onDragStart}
        style={{ background: 'linear-gradient(to bottom, var(--color-bg-card), var(--color-bg-secondary))' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/30 via-accent-purple/10 to-transparent" />
        <div className="absolute top-0 left-0 right-0 flex justify-center pt-0.5">
          <span className={`${dims.nameText} font-display uppercase tracking-widest text-accent-purple opacity-80`}>
            룬
          </span>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${dims.symbolText} font-display font-bold text-accent-purple text-shadow-glow leading-none`}>
            {card.symbol === '*' ? '×' : card.symbol}
          </span>
        </div>
      </div>
    );
  }

  // -------- Artifact card --------
  const art = card;
  const rarity = RARITY_STYLES[art.rarity] || RARITY_STYLES.common;
  // Flex column layout: name banner / value-symbol middle / power stars bottom.
  // Each region has minimum room and the middle uses flex-1 to fill remaining.
  return (
    <div
      className={`card-frame ${dims.wrap} flex flex-col border-2 ${rarity.border} ${rarity.glow} rounded-lg overflow-hidden ${baseInteract} ${selectionRing} ${className}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      style={{ background: 'linear-gradient(to bottom, var(--color-bg-card), #1a1730)' }}
    >
      {/* Name banner at top — flex-shrink-0 so it never collapses */}
      <div
        className="px-0.5 py-0.5 bg-gradient-to-b from-black/60 to-transparent flex-shrink-0 flex items-center justify-center"
        style={{ minHeight: size === 'sm' ? '24px' : size === 'md' ? '32px' : '42px' }}
      >
        <div
          className={`font-serif-kr font-bold ${dims.artifactName} text-center text-text-primary leading-[1.1] px-0.5`}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: size === 'sm' ? 2 : 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'keep-all',
          }}
        >
          {art.name}
        </div>
      </div>

      {/* Middle: numeric value / symbol — takes remaining flex space */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-1">
        {art.value !== undefined && (
          <span className={`${dims.artifactValue} font-display font-bold text-text-primary text-shadow-glow leading-none`}>
            {art.value}
          </span>
        )}
        {art.symbol && (
          <span className={`${dims.artifactSymbol} font-display font-bold text-accent-purple text-shadow-glow leading-none`}>
            {art.symbol === '*' ? '×' : art.symbol}
          </span>
        )}
        {art.value === undefined && !art.symbol && (
          <span className="text-accent-gold text-xl font-display">◈</span>
        )}
      </div>

      {/* Bottom: power stars — flex-shrink-0 so they're never cropped */}
      <div className="flex justify-center pb-0.5 flex-shrink-0 min-h-[12px]">
        <PowerStars count={art.power} className={dims.starText} />
      </div>
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
  const rarity = RARITY_STYLES[equipment.rarity] || RARITY_STYLES.common;
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
      className={`${sizeClasses} bg-gradient-to-br from-bg-card to-bg-secondary border ${rarity.border} rounded-lg cursor-pointer hover:brightness-125 transition-all flex items-center gap-2 ${
        selected ? 'ring-2 ring-accent-gold' : ''
      }`}
      onClick={onClick}
    >
      <span className="text-base">{slotIcons[equipment.slot] || '⚙️'}</span>
      <div className="flex-1 min-w-0">
        <div className="font-decorative font-semibold text-text-primary truncate">{equipment.name}</div>
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
    <div className="bg-bg-secondary border-2 border-border rounded-lg p-3 shadow-2xl max-w-64 z-50 card-frame">
      <div className="font-decorative font-bold text-base text-accent-gold mb-2 text-shadow-glow">
        {card.name}
      </div>
      <div className="text-xs text-text-secondary space-y-1">
        {card.cardType === 'element' && (
          <>
            <div>
              <span className="text-text-muted">원소</span>{' '}
              <span className="text-text-primary font-medium">
                {ELEMENT_NAMES_KO[card.elementName] || card.elementName}
              </span>
            </div>
            <div>
              <span className="text-text-muted">값</span>{' '}
              <span className="font-display text-lg text-text-primary">{card.value}</span>
            </div>
            <div>
              <span className="text-text-muted">파워</span>{' '}
              <PowerStars count={card.power} />
            </div>
          </>
        )}
        {card.cardType === 'rune' && (
          <div>
            <span className="text-text-muted">연산</span>{' '}
            <span className="font-display text-xl text-accent-purple">
              {card.symbol === '*' ? '×' : card.symbol}
            </span>
          </div>
        )}
        {card.cardType === 'artifact' && (
          <>
            {card.value !== undefined && (
              <div>
                <span className="text-text-muted">값</span>{' '}
                <span className="font-display text-lg">{card.value}</span>
              </div>
            )}
            {card.symbol && (
              <div>
                <span className="text-text-muted">기호</span>{' '}
                <span className="font-display text-xl text-accent-purple">
                  {card.symbol === '*' ? '×' : card.symbol}
                </span>
              </div>
            )}
            <div>
              <span className="text-text-muted">파워</span>{' '}
              <PowerStars count={card.power} />
            </div>
            <div className="text-[10px] uppercase tracking-widest font-display font-bold mt-1">
              <span className={
                card.rarity === 'legendary' ? 'text-rarity-legendary' :
                card.rarity === 'epic' ? 'text-rarity-epic' :
                card.rarity === 'rare' ? 'text-rarity-rare' :
                'text-rarity-common'
              }>
                ◆ {RARITY_STYLES[card.rarity]?.label ?? card.rarity}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-border text-text-primary leading-relaxed">
              {card.effectDescription}
            </div>
            {card.versatile && <div className="text-accent-green text-[10px]">⟡ 다용도</div>}
          </>
        )}
      </div>
    </div>
  );
}
