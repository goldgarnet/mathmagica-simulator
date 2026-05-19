export type ElementName = 'life' | 'fire' | 'air' | 'water' | 'earth' | 'lightning' | 'void' | 'light';
export type RuneSymbol = '+' | '*' | '-' | '/';
export type CardType = 'element' | 'rune' | 'artifact';
export type EquipmentSlot = 'hat' | 'robe' | 'leftHand' | 'rightHand' | 'accessory';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type MonsterTier = 'I' | 'II' | 'III' | 'boss';

export type KeywordType =
  | { type: 'extraAttack' }
  | { type: 'immunity'; value: number }
  | { type: 'shield'; count: number }
  | { type: 'vulnerable'; value: number }
  | { type: 'weakened'; value: number }
  | { type: 'curse' }
  | { type: 'bleed'; value: number }
  | { type: 'strengthen'; value: number };

export interface ElementCard {
  cardType: 'element';
  id: string;
  name: string;
  elementName: ElementName;
  value: number;
  power: number;
}

export interface RuneCard {
  cardType: 'rune';
  id: string;
  name: string;
  symbol: RuneSymbol;
}

export interface ArtifactCard {
  cardType: 'artifact';
  id: string;
  name: string;
  value?: number;
  symbol?: RuneSymbol;
  power: number;
  rarity: Rarity;
  effectDescription: string;
  effectId: string;
  versatile?: boolean;
}

export type Card = ElementCard | RuneCard | ArtifactCard;

export type EquipmentUseCost =
  | { type: 'mana'; amount: number }
  | { type: 'oncePerScenario' }
  | { type: 'oncePerScenarioPermanent' };

export interface EquipmentDef {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  effectDescription: string;
  effectId: string;
  activeUse?: {
    cost: EquipmentUseCost;
    label: string;
  };
}

export interface MonsterPatternEntry {
  name: string;
  targetValue?: number;
  targetPower?: number;
  damage?: number;
  effectDescription: string;
  effectId: string;
  secondaryDamage?: number;
  secondaryTargetValue?: number;
  secondaryTargetPower?: number;
}

export interface MonsterDef {
  id: string;
  name: string;
  tier: MonsterTier;
  soulValue: number | number[];
  soulPower: number;
  keywords: KeywordType[];
  patternDeck: MonsterPatternEntry[];
  specialRules?: string;
}

export interface CardInstance {
  instanceId: string;
  cardId: string;
  ownerId: string;
}

export interface MagicLine {
  cards: CardInstance[];
  imprintPower: number;
  equalsCard?: CardInstance | null;
}

export type StatusKey =
  | 'immunity'
  | 'shield'
  | 'vulnerable'
  | 'weakened'
  | 'curse'
  | 'bleed'
  | 'strengthen'
  | 'extraAttack';

export const STATUS_KEYS: StatusKey[] = [
  'shield', 'immunity', 'vulnerable', 'weakened',
  'curse', 'bleed', 'strengthen', 'extraAttack',
];

export const STATUS_LABELS: Record<StatusKey, string> = {
  immunity: '면역',
  shield: '보호막',
  vulnerable: '취약',
  weakened: '약화',
  curse: '저주',
  bleed: '출혈',
  strengthen: '강화',
  extraAttack: '추가공격',
};

export type StatusCounters = Partial<Record<StatusKey, number>>;

export interface PlayerState {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  mana: number;
  deck: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exiledCards: CardInstance[];
  magicLines: [MagicLine, MagicLine, MagicLine];
  equipment: {
    hat: EquipmentDef | null;
    robe: EquipmentDef | null;
    leftHand: EquipmentDef | null;
    rightHand: EquipmentDef | null;
    accessories: EquipmentDef[];
  };
  statusCounters: StatusCounters;
  equipmentUsedThisScenario: string[];
}

export interface MonsterInstance {
  instanceId: string;
  defId: string;
  currentPattern: MonsterPatternEntry | null;
  patternDeck: MonsterPatternEntry[];
  patternDiscard: MonsterPatternEntry[];
  destroyedSouls: number[];
  isDead: boolean;
  statusCounters: StatusCounters;
  slotIndex: number;
}

export interface MonsterSlot {
  queue: string[];
  activeMonster: MonsterInstance | null;
}

export type GamePhase = 'setup' | 'playing' | 'victory' | 'defeat';

export interface GameLogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'action' | 'damage' | 'kill' | 'defense' | 'effect' | 'phase';
}

export interface CampaignConfig {
  players: {
    name: string;
    hp: number;
    deckCardIds: string[];
    equipment: {
      hat?: string;
      robe?: string;
      leftHand?: string;
      rightHand?: string;
      accessories: string[];
    };
  }[];
  monsterSlots: { queue: string[] }[];
  isTutorial?: boolean;
}

export interface CastResult {
  value: number;
  power: number;
  cardsUsed: CardInstance[];
}

export interface SubFormula {
  value: number;
  power: number;
  startIndex: number;
  endIndex: number;
}
