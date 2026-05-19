import { create } from 'zustand';
import type {
  PlayerState, MonsterInstance, MonsterSlot, GamePhase,
  GameLogEntry, CampaignConfig, CardInstance, MagicLine, EquipmentDef,
  StatusKey, StatusCounters,
} from '../types';
import { getCardById, getEquipmentById } from '../data/cards';
import { getMonsterById } from '../data/monsters';
import { evaluateMagicLine } from '../engine/formula';

let nextInstanceId = 1;
function genId(): string { return `inst-${nextInstanceId++}`; }

function shuffle<T>(arr: T[], skipShuffle = false): T[] {
  const a = [...arr];
  if (skipShuffle) return a;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createCardInstance(cardId: string, ownerId: string): CardInstance {
  return { instanceId: genId(), cardId, ownerId };
}

function initialStatusFromKeywords(keywords: { type: string; value?: number; count?: number }[]): StatusCounters {
  const counters: StatusCounters = {};
  for (const k of keywords) {
    const v = (k as any).value ?? (k as any).count ?? 1;
    const key = k.type as StatusKey;
    counters[key] = (counters[key] ?? 0) + v;
  }
  return counters;
}

function createMonsterInstance(defId: string, slotIndex: number, tutorialMode = false): MonsterInstance {
  const def = getMonsterById(defId)!;
  const patternDeck = shuffle([...def.patternDeck], tutorialMode);
  return {
    instanceId: genId(),
    defId,
    currentPattern: null,
    patternDeck,
    patternDiscard: [],
    destroyedSouls: [],
    isDead: false,
    statusCounters: initialStatusFromKeywords(def.keywords as any),
    slotIndex,
  };
}

interface GameStore {
  phase: GamePhase;
  round: number;
  players: PlayerState[];
  monsterSlots: MonsterSlot[];
  activePlayerIndex: number;
  log: GameLogEntry[];
  tutorialMode: boolean;
  lastConfig: CampaignConfig | null;
  drawCount: number;

  // Lifecycle
  initGame: (config: CampaignConfig) => void;
  restartGame: () => void;
  forfeitGame: () => void;
  declareVictory: () => void;
  addLog: (message: string, type: GameLogEntry['type']) => void;

  // Compatibility (kept so App.tsx still works)
  startRound: () => void;

  // Round flow
  nextRound: () => void;

  // View
  setActivePlayer: (index: number) => void;

  // Card actions
  drawCard: (playerIndex: number) => void;
  drawCards: (playerIndex: number, count: number) => void;
  reshuffleDiscard: (playerIndex: number) => void;
  placeCardOnLine: (
    fromPlayerIndex: number,
    cardInstanceId: string,
    targetPlayerIndex: number,
    lineIndex: number,
    asEquals?: boolean,
  ) => void;
  removeCardFromLine: (
    playerIndex: number,
    lineIndex: number,
    cardIndex: number,
  ) => void;
  toggleEqualsCard: (playerIndex: number, lineIndex: number) => void;
  discardLine: (playerIndex: number, lineIndex: number) => void;
  discardFromHand: (playerIndex: number, cardInstanceId: string) => void;
  recoverFromDiscard: (playerIndex: number, cardInstanceId: string) => void;
  exileFromHand: (playerIndex: number, cardInstanceId: string) => void;

  // Player adjustments
  adjustHp: (playerIndex: number, delta: number) => void;
  setHp: (playerIndex: number, hp: number) => void;
  adjustMana: (playerIndex: number, delta: number) => void;
  setMana: (playerIndex: number, mana: number) => void;
  adjustPlayerStatus: (playerIndex: number, key: StatusKey, delta: number) => void;

  // Equipment
  useEquipment: (playerIndex: number, equipmentId: string) => boolean;
  resetEquipmentUse: (playerIndex: number, equipmentId: string) => void;

  // Monster
  drawMonsterPattern: (slotIndex: number) => void;
  killMonster: (slotIndex: number) => void;
  reviveMonster: (slotIndex: number) => void;
  destroySoul: (slotIndex: number, soulValue: number) => void;
  restoreSoul: (slotIndex: number, soulValue: number) => void;
  adjustMonsterStatus: (slotIndex: number, key: StatusKey, delta: number) => void;
  spawnNextMonsterInSlot: (slotIndex: number) => void;

  // Reference helpers
  getMagicLineResult: (playerIndex: number, lineIndex: number) => { value: number; power: number } | null;
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'setup',
  round: 0,
  players: [],
  monsterSlots: [],
  activePlayerIndex: 0,
  log: [],
  tutorialMode: false,
  lastConfig: null,
  drawCount: 5,

  initGame: (config) => {
    nextInstanceId = 1;
    const isTutorial = config.isTutorial === true;
    const players: PlayerState[] = config.players.map((pc, i) => {
      const deck = shuffle(
        pc.deckCardIds.map(cid => createCardInstance(cid, `player-${i}`)),
        isTutorial,
      );

      return {
        id: `player-${i}`,
        name: pc.name,
        maxHp: pc.hp,
        hp: pc.hp,
        mana: 0,
        deck,
        hand: [],
        discardPile: [],
        exiledCards: [],
        magicLines: [
          { cards: [], imprintPower: 0, equalsCard: null },
          { cards: [], imprintPower: 0, equalsCard: null },
          { cards: [], imprintPower: 0, equalsCard: null },
        ] as [MagicLine, MagicLine, MagicLine],
        equipment: {
          hat: pc.equipment.hat ? (getEquipmentById(pc.equipment.hat) ?? null) : null,
          robe: pc.equipment.robe ? (getEquipmentById(pc.equipment.robe) ?? null) : null,
          leftHand: pc.equipment.leftHand ? (getEquipmentById(pc.equipment.leftHand) ?? null) : null,
          rightHand: pc.equipment.rightHand ? (getEquipmentById(pc.equipment.rightHand) ?? null) : null,
          accessories: pc.equipment.accessories.map(id => getEquipmentById(id)).filter(Boolean) as EquipmentDef[],
        },
        statusCounters: {},
        equipmentUsedThisScenario: [],
      };
    });

    const monsterSlots: MonsterSlot[] = config.monsterSlots.map((slot, si) => {
      const queue = [...slot.queue];
      let activeMonster: MonsterInstance | null = null;
      if (queue.length > 0) {
        const firstId = queue.shift()!;
        activeMonster = createMonsterInstance(firstId, si, isTutorial);
      }
      return { queue, activeMonster };
    });

    set({
      phase: 'playing',
      round: 0,
      players,
      monsterSlots,
      activePlayerIndex: 0,
      log: [{ timestamp: Date.now(), message: '게임 시작', type: 'phase' }],
      tutorialMode: isTutorial,
      lastConfig: config,
    });
  },

  restartGame: () => {
    const config = get().lastConfig;
    if (config) get().initGame(config);
  },

  forfeitGame: () => {
    get().addLog('전투를 포기했습니다.', 'phase');
    set({ phase: 'defeat' });
  },

  declareVictory: () => {
    get().addLog('승리 선언!', 'phase');
    set({ phase: 'victory' });
  },

  addLog: (message, type) =>
    set((state) => ({
      log: [...state.log, { timestamp: Date.now(), message, type }],
    })),

  // App.tsx still calls this on "전투 시작"; treat as first round trigger.
  startRound: () => {
    const state = get();
    if (state.round === 0 && state.phase === 'playing') {
      get().nextRound();
    }
  },

  nextRound: () => {
    const state = get();
    if (state.phase !== 'playing') return;
    const newRound = state.round + 1;
    const tutorial = state.tutorialMode;

    // Draw a pattern for each alive monster — tutorial keeps the fixed order
    // (createMonsterInstance already skipped the shuffle in tutorial mode, and
    //  reshuffles below also skip shuffling, so the deck order is stable).
    const monsterSlots = state.monsterSlots.map(slot => {
      if (!slot.activeMonster || slot.activeMonster.isDead) return slot;
      const m = { ...slot.activeMonster };
      if (m.currentPattern) {
        m.patternDiscard = [...m.patternDiscard, m.currentPattern];
        m.currentPattern = null;
      }
      if (m.patternDeck.length === 0) {
        m.patternDeck = shuffle([...m.patternDiscard], tutorial);
        m.patternDiscard = [];
      }
      if (m.patternDeck.length > 0) {
        m.currentPattern = m.patternDeck[0];
        m.patternDeck = m.patternDeck.slice(1);
      }
      return { ...slot, activeMonster: m };
    });

    // +1 mana for every alive player
    const players = state.players.map(p =>
      p.hp > 0 ? { ...p, mana: p.mana + 1 } : p
    );

    get().addLog(`=== 라운드 ${newRound} 시작 (마나 +1, 패턴 갱신) ===`, 'phase');
    monsterSlots.forEach(slot => {
      if (slot.activeMonster?.currentPattern) {
        const def = getMonsterById(slot.activeMonster.defId);
        get().addLog(
          `${def?.name}: ${slot.activeMonster.currentPattern.name} — ${slot.activeMonster.currentPattern.effectDescription}`,
          'info'
        );
      }
    });

    set({ round: newRound, monsterSlots, players });
  },

  setActivePlayer: (index) => set({ activePlayerIndex: index }),

  drawCard: (playerIndex) => get().drawCards(playerIndex, 1),

  drawCards: (playerIndex, count) =>
    set((state) => {
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      let deck = [...p.deck];
      const hand = [...p.hand];
      let discard = [...p.discardPile];
      let reshuffled = false;

      for (let i = 0; i < count; i++) {
        if (deck.length === 0) {
          if (discard.length === 0) break;
          deck = shuffle(discard, state.tutorialMode);
          discard = [];
          reshuffled = true;
        }
        hand.push(deck.shift()!);
      }

      p.deck = deck;
      p.hand = hand;
      p.discardPile = discard;
      players[playerIndex] = p;
      if (reshuffled) {
        get().addLog(`${p.name}: 덱이 비어 버린 패를 섞었습니다.`, 'info');
      }
      return { players };
    }),

  reshuffleDiscard: (playerIndex) =>
    set((state) => {
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      if (p.discardPile.length === 0) return state;
      const merged = shuffle([...p.deck, ...p.discardPile], state.tutorialMode);
      p.deck = merged;
      p.discardPile = [];
      players[playerIndex] = p;
      get().addLog(`${p.name}: 버린 패를 덱에 섞었습니다.`, 'info');
      return { players };
    }),

  placeCardOnLine: (fromPlayerIndex, cardInstanceId, targetPlayerIndex, lineIndex, asEquals = false) =>
    set((state) => {
      const players = [...state.players];
      const fromPlayer = { ...players[fromPlayerIndex] };
      const idx = fromPlayer.hand.findIndex(c => c.instanceId === cardInstanceId);
      if (idx === -1) return state;

      const card = fromPlayer.hand[idx];
      fromPlayer.hand = fromPlayer.hand.filter((_, i) => i !== idx);

      const targetPlayer = targetPlayerIndex === fromPlayerIndex
        ? fromPlayer
        : { ...players[targetPlayerIndex] };
      const lines = [...targetPlayer.magicLines] as [MagicLine, MagicLine, MagicLine];
      const line = { ...lines[lineIndex] };

      const placedCard = { ...card, ownerId: targetPlayer.id };

      if (asEquals) {
        // Return any existing equals card to source player's hand
        if (line.equalsCard) {
          const owner = line.equalsCard.ownerId === fromPlayer.id
            ? fromPlayer
            : players.find(pl => pl.id === line.equalsCard!.ownerId);
          if (owner) {
            owner.hand = [...owner.hand, line.equalsCard];
          }
        }
        line.equalsCard = placedCard;
      } else {
        line.cards = [...line.cards, placedCard];
      }

      lines[lineIndex] = line;
      targetPlayer.magicLines = lines;

      players[fromPlayerIndex] = fromPlayer;
      if (targetPlayerIndex !== fromPlayerIndex) {
        players[targetPlayerIndex] = targetPlayer;
      }
      return { players };
    }),

  removeCardFromLine: (playerIndex, lineIndex, cardIndex) =>
    set((state) => {
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      const lines = [...p.magicLines] as [MagicLine, MagicLine, MagicLine];
      const line = { ...lines[lineIndex] };
      if (cardIndex < 0 || cardIndex >= line.cards.length) return state;
      const removed = line.cards[cardIndex];
      line.cards = line.cards.filter((_, i) => i !== cardIndex);
      lines[lineIndex] = line;
      p.magicLines = lines;

      // Card returns to the owner's hand
      const ownerIdx = players.findIndex(pl => pl.id === removed.ownerId);
      if (ownerIdx >= 0 && ownerIdx !== playerIndex) {
        const owner = { ...players[ownerIdx] };
        owner.hand = [...owner.hand, removed];
        players[ownerIdx] = owner;
      } else {
        p.hand = [...p.hand, removed];
      }
      players[playerIndex] = p;
      return { players };
    }),

  toggleEqualsCard: (playerIndex, lineIndex) =>
    set((state) => {
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      const lines = [...p.magicLines] as [MagicLine, MagicLine, MagicLine];
      const line = { ...lines[lineIndex] };
      if (!line.equalsCard) return state;
      const ownerIdx = players.findIndex(pl => pl.id === line.equalsCard!.ownerId);
      const target = ownerIdx >= 0 ? { ...players[ownerIdx] } : p;
      target.hand = [...target.hand, line.equalsCard];
      line.equalsCard = null;
      lines[lineIndex] = line;
      p.magicLines = lines;
      if (ownerIdx >= 0 && ownerIdx !== playerIndex) {
        players[ownerIdx] = target;
      } else {
        Object.assign(p, target);
      }
      players[playerIndex] = p;
      return { players };
    }),

  discardLine: (playerIndex, lineIndex) =>
    set((state) => {
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      const lines = [...p.magicLines] as [MagicLine, MagicLine, MagicLine];
      const line = lines[lineIndex];

      const allCards: CardInstance[] = [...line.cards];
      if (line.equalsCard) allCards.push(line.equalsCard);

      // Each card returns to its owner's discard
      allCards.forEach(ci => {
        const ownerIdx = players.findIndex(pl => pl.id === ci.ownerId);
        if (ownerIdx >= 0 && ownerIdx !== playerIndex) {
          const owner = { ...players[ownerIdx] };
          owner.discardPile = [...owner.discardPile, ci];
          players[ownerIdx] = owner;
        } else {
          p.discardPile = [...p.discardPile, ci];
        }
      });

      lines[lineIndex] = { cards: [], imprintPower: 0, equalsCard: null };
      p.magicLines = lines;
      players[playerIndex] = p;
      if (allCards.length > 0) {
        get().addLog(`${p.name}: 마법열 ${lineIndex + 1} 정리 (${allCards.length}장 버림)`, 'action');
      }
      return { players };
    }),

  discardFromHand: (playerIndex, cardInstanceId) =>
    set((state) => {
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      const idx = p.hand.findIndex(c => c.instanceId === cardInstanceId);
      if (idx === -1) return state;
      const card = p.hand[idx];
      p.hand = p.hand.filter((_, i) => i !== idx);
      // Return to owner's discard pile
      const ownerIdx = players.findIndex(pl => pl.id === card.ownerId);
      if (ownerIdx >= 0 && ownerIdx !== playerIndex) {
        const owner = { ...players[ownerIdx] };
        owner.discardPile = [...owner.discardPile, card];
        players[ownerIdx] = owner;
      } else {
        p.discardPile = [...p.discardPile, card];
      }
      players[playerIndex] = p;
      return { players };
    }),

  recoverFromDiscard: (playerIndex, cardInstanceId) =>
    set((state) => {
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      const idx = p.discardPile.findIndex(c => c.instanceId === cardInstanceId);
      if (idx === -1) return state;
      const card = p.discardPile[idx];
      p.discardPile = p.discardPile.filter((_, i) => i !== idx);
      p.hand = [...p.hand, card];
      players[playerIndex] = p;
      return { players };
    }),

  exileFromHand: (playerIndex, cardInstanceId) =>
    set((state) => {
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      const idx = p.hand.findIndex(c => c.instanceId === cardInstanceId);
      if (idx === -1) return state;
      const card = p.hand[idx];
      p.hand = p.hand.filter((_, i) => i !== idx);
      p.exiledCards = [...p.exiledCards, card];
      players[playerIndex] = p;
      return { players };
    }),

  adjustHp: (playerIndex, delta) =>
    set((state) => {
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      p.hp = Math.max(0, Math.min(p.maxHp, p.hp + delta));
      players[playerIndex] = p;
      return { players };
    }),

  setHp: (playerIndex, hp) =>
    set((state) => {
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      p.hp = Math.max(0, Math.min(p.maxHp, hp));
      players[playerIndex] = p;
      return { players };
    }),

  adjustMana: (playerIndex, delta) =>
    set((state) => {
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      p.mana = Math.max(0, p.mana + delta);
      players[playerIndex] = p;
      return { players };
    }),

  setMana: (playerIndex, mana) =>
    set((state) => {
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      p.mana = Math.max(0, mana);
      players[playerIndex] = p;
      return { players };
    }),

  adjustPlayerStatus: (playerIndex, key, delta) =>
    set((state) => {
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      const next = { ...p.statusCounters };
      const v = (next[key] ?? 0) + delta;
      if (v <= 0) delete next[key]; else next[key] = v;
      p.statusCounters = next;
      players[playerIndex] = p;
      return { players };
    }),

  useEquipment: (playerIndex, equipmentId) => {
    const state = get();
    const player = state.players[playerIndex];
    if (!player) return false;

    const allEquips: EquipmentDef[] = [
      player.equipment.hat,
      player.equipment.robe,
      player.equipment.leftHand,
      player.equipment.rightHand,
      ...player.equipment.accessories,
    ].filter(Boolean) as EquipmentDef[];

    const equip = allEquips.find(e => e.id === equipmentId);
    if (!equip || !equip.activeUse) return false;

    const usage = equip.activeUse;
    const wasUsed = player.equipmentUsedThisScenario.includes(equipmentId);
    const isOncePer =
      usage.cost.type === 'oncePerScenario' || usage.cost.type === 'oncePerScenarioPermanent';

    if (isOncePer && wasUsed) {
      get().addLog(`${equip.name}은(는) 이미 사용했습니다.`, 'info');
      return false;
    }
    if (usage.cost.type === 'mana' && player.mana < usage.cost.amount) {
      get().addLog(`마나가 부족합니다. (필요: ${usage.cost.amount})`, 'info');
      return false;
    }

    set((st) => {
      const players = [...st.players];
      const p = { ...players[playerIndex] };
      if (usage.cost.type === 'mana') p.mana -= usage.cost.amount;
      if (isOncePer) p.equipmentUsedThisScenario = [...p.equipmentUsedThisScenario, equipmentId];
      players[playerIndex] = p;
      return { players };
    });

    get().addLog(`${player.name}: ${equip.name} 발동 — ${equip.effectDescription}`, 'effect');
    return true;
  },

  resetEquipmentUse: (playerIndex, equipmentId) =>
    set((state) => {
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      p.equipmentUsedThisScenario = p.equipmentUsedThisScenario.filter(id => id !== equipmentId);
      players[playerIndex] = p;
      return { players };
    }),

  drawMonsterPattern: (slotIndex) =>
    set((state) => {
      const slots = [...state.monsterSlots];
      const slot = slots[slotIndex];
      if (!slot?.activeMonster || slot.activeMonster.isDead) return state;
      const m = { ...slot.activeMonster };
      if (m.currentPattern) {
        m.patternDiscard = [...m.patternDiscard, m.currentPattern];
        m.currentPattern = null;
      }
      if (m.patternDeck.length === 0) {
        m.patternDeck = shuffle([...m.patternDiscard], state.tutorialMode);
        m.patternDiscard = [];
        get().addLog(
          `${getMonsterById(m.defId)?.name}: 패턴 덱을 다시 ${state.tutorialMode ? '정렬' : '섞었'}습니다.`,
          'info'
        );
      }
      if (m.patternDeck.length > 0) {
        m.currentPattern = m.patternDeck[0];
        m.patternDeck = m.patternDeck.slice(1);
      }
      slots[slotIndex] = { ...slot, activeMonster: m };
      if (m.currentPattern) {
        get().addLog(
          `${getMonsterById(m.defId)?.name}: ${m.currentPattern.name} — ${m.currentPattern.effectDescription}`,
          'info'
        );
      }
      return { monsterSlots: slots };
    }),

  killMonster: (slotIndex) => {
    set((state) => {
      const slots = [...state.monsterSlots];
      const slot = slots[slotIndex];
      if (!slot?.activeMonster) return state;
      const def = getMonsterById(slot.activeMonster.defId);
      const m = { ...slot.activeMonster, isDead: true };
      slots[slotIndex] = { ...slot, activeMonster: m };
      get().addLog(`${def?.name} 처치!`, 'kill');
      return { monsterSlots: slots };
    });
    // Auto-spawn the next queued monster after a beat
    get().spawnNextMonsterInSlot(slotIndex);
  },

  reviveMonster: (slotIndex) =>
    set((state) => {
      const slots = [...state.monsterSlots];
      const slot = slots[slotIndex];
      if (!slot?.activeMonster) return state;
      slots[slotIndex] = { ...slot, activeMonster: { ...slot.activeMonster, isDead: false } };
      return { monsterSlots: slots };
    }),

  destroySoul: (slotIndex, soulValue) =>
    set((state) => {
      const slots = [...state.monsterSlots];
      const slot = slots[slotIndex];
      if (!slot?.activeMonster) return state;
      const m = { ...slot.activeMonster };
      if (m.destroyedSouls.includes(soulValue)) return state;
      m.destroyedSouls = [...m.destroyedSouls, soulValue];
      slots[slotIndex] = { ...slot, activeMonster: m };
      get().addLog(`${getMonsterById(m.defId)?.name}의 소울 ${soulValue} 파괴`, 'effect');
      return { monsterSlots: slots };
    }),

  restoreSoul: (slotIndex, soulValue) =>
    set((state) => {
      const slots = [...state.monsterSlots];
      const slot = slots[slotIndex];
      if (!slot?.activeMonster) return state;
      const m = { ...slot.activeMonster };
      m.destroyedSouls = m.destroyedSouls.filter(s => s !== soulValue);
      slots[slotIndex] = { ...slot, activeMonster: m };
      return { monsterSlots: slots };
    }),

  adjustMonsterStatus: (slotIndex, key, delta) =>
    set((state) => {
      const slots = [...state.monsterSlots];
      const slot = slots[slotIndex];
      if (!slot?.activeMonster) return state;
      const m = { ...slot.activeMonster };
      const next = { ...m.statusCounters };
      const v = (next[key] ?? 0) + delta;
      if (v <= 0) delete next[key]; else next[key] = v;
      m.statusCounters = next;
      slots[slotIndex] = { ...slot, activeMonster: m };
      return { monsterSlots: slots };
    }),

  spawnNextMonsterInSlot: (slotIndex) =>
    set((state) => {
      const slots = [...state.monsterSlots];
      const slot = slots[slotIndex];
      if (!slot) return state;
      // Only spawn if current is dead or empty AND queue has more
      if (slot.activeMonster && !slot.activeMonster.isDead) return state;
      if (slot.queue.length === 0) return state;
      const queue = [...slot.queue];
      const nextId = queue.shift()!;
      const newMonster = createMonsterInstance(nextId, slotIndex, state.tutorialMode);
      slots[slotIndex] = { queue, activeMonster: newMonster };
      get().addLog(`슬롯 ${slotIndex + 1}에 ${getMonsterById(nextId)?.name} 등장!`, 'info');
      return { monsterSlots: slots };
    }),

  getMagicLineResult: (playerIndex, lineIndex) => {
    const state = get();
    const player = state.players[playerIndex];
    if (!player) return null;
    const line = player.magicLines[lineIndex];
    if (line.cards.length === 0) return null;
    const cards = line.cards.map(ci => getCardById(ci.cardId)!).filter(Boolean);
    const result = evaluateMagicLine(cards);
    if (!result) return null;
    return { value: result.value, power: result.power + line.imprintPower };
  },
}));
