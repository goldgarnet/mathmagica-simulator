import { create } from 'zustand';
import type {
  PlayerState, MonsterInstance, MonsterSlot, GamePhase,
  GameLogEntry, CampaignConfig, CardInstance, MagicLine, EquipmentDef,
} from '../types';
import { getCardById, getEquipmentById } from '../data/cards';
import { getMonsterById } from '../data/monsters';
import { evaluateMagicLine, canDestroySoul, canDefendAttack } from '../engine/formula';

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

function createMonsterInstance(defId: string, slotIndex: number, tutorialMode = false): MonsterInstance {
  const def = getMonsterById(defId)!;
  const patternDeck = shuffle([...def.patternDeck], tutorialMode);
  return {
    instanceId: genId(),
    defId,
    currentKeywords: [...def.keywords],
    currentPattern: null,
    patternDeck,
    patternDiscard: [],
    destroyedSouls: [],
    isDead: false,
    shieldCount: def.keywords.reduce((s, k) => k.type === 'shield' ? s + k.count : s, 0),
    strengthenStacks: 0,
    slotIndex,
  };
}

interface GameStore {
  phase: GamePhase;
  round: number;
  players: PlayerState[];
  monsterSlots: MonsterSlot[];
  currentPlayerIndex: number;
  playerOrder: number[];
  log: GameLogEntry[];
  selectedMagicLineIndex: number | null;
  placedOnOtherThisTurn: boolean;
  maxHandSize: number;
  drawCount: number;
  tutorialMode: boolean;
  lastConfig: CampaignConfig | null;
  pendingDamageReduction: number;

  initGame: (config: CampaignConfig) => void;
  restartGame: () => void;
  forfeitGame: () => void;
  addLog: (message: string, type: GameLogEntry['type']) => void;

  // Round flow
  startRound: () => void;
  setPlayerOrder: (order: number[]) => void;
  startPlayerTurn: () => void;

  // Player actions
  drawCards: (playerIndex: number, count: number) => void;
  placeCardOnMagicLine: (cardInstanceId: string, magicLineIndex: number, targetPlayerIndex?: number) => void;
  removeCardFromMagicLine: (magicLineIndex: number, cardIndex: number) => void;
  castMagicLine: (magicLineIndex: number) => { value: number; power: number } | null;
  equalsCast: (cardInstanceId: string, magicLineIndex: number) => { value: number; power: number } | null;
  useArtifact: (cardInstanceId: string) => void;
  useEquipment: (equipmentId: string) => boolean;
  placeEqualsCard: (cardInstanceId: string, magicLineIndex: number) => void;
  removeEqualsCard: (magicLineIndex: number) => void;
  endPlayerTurn: () => void;

  // Combat resolution
  activateMagic: (value: number, power: number, targetType: 'monster' | 'defense', targetId: string) => boolean;
  processMonsterAttacks: () => void;
  defendAttack: (monsterInstanceId: string, magicLineIndex: number) => boolean;

  // Monster management
  spawnNextMonsters: () => void;
  checkGameEnd: () => 'victory' | 'defeat' | null;

  // Utility
  getCurrentPlayer: () => PlayerState | null;
  getMagicLineResult: (playerIndex: number, lineIndex: number) => { value: number; power: number } | null;
  discardHand: (playerIndex: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'setup',
  round: 0,
  players: [],
  monsterSlots: [],
  currentPlayerIndex: 0,
  playerOrder: [],
  log: [],
  selectedMagicLineIndex: null,
  placedOnOtherThisTurn: false,
  maxHandSize: 10,
  drawCount: 5,
  tutorialMode: false,
  lastConfig: null,
  pendingDamageReduction: 0,

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
        statusEffects: [],
        turnOrder: i,
        hasActedThisRound: false,
        hasBeenAttackedThisRound: false,
        drawReduction: 0,
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
      phase: 'setup',
      round: 0,
      players,
      monsterSlots,
      currentPlayerIndex: 0,
      playerOrder: players.map((_, i) => i),
      log: [],
      placedOnOtherThisTurn: false,
      tutorialMode: isTutorial,
      lastConfig: config,
      pendingDamageReduction: 0,
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

  addLog: (message, type) =>
    set((state) => ({
      log: [...state.log, { timestamp: Date.now(), message, type }],
    })),

  startRound: () => {
    const state = get();
    const newRound = state.round + 1;
    const tutorial = state.tutorialMode;

    // Draw pattern cards for each active monster
    const monsterSlots = state.monsterSlots.map(slot => {
      if (!slot.activeMonster || slot.activeMonster.isDead) return slot;
      const m = { ...slot.activeMonster };
      const def = getMonsterById(m.defId)!;

      if (tutorial) {
        // Tutorial: always use the first pattern from the definition
        m.currentPattern = def.patternDeck[0];
      } else {
        if (m.patternDeck.length === 0) {
          m.patternDeck = shuffle([...m.patternDiscard]);
          m.patternDiscard = [];
        }
        if (m.patternDeck.length > 0) {
          m.currentPattern = m.patternDeck[0];
          m.patternDeck = m.patternDeck.slice(1);
        }
      }
      return { ...slot, activeMonster: m };
    });

    // Reset player round state
    const players = state.players.map(p => ({
      ...p,
      hasActedThisRound: false,
      hasBeenAttackedThisRound: false,
    }));

    get().addLog(`=== 라운드 ${newRound} 시작 ===`, 'phase');

    monsterSlots.forEach(slot => {
      if (slot.activeMonster?.currentPattern) {
        const def = getMonsterById(slot.activeMonster.defId);
        get().addLog(
          `${def?.name}: ${slot.activeMonster.currentPattern.name} - ${slot.activeMonster.currentPattern.effectDescription}`,
          'info'
        );
      }
    });

    set({
      round: newRound,
      monsterSlots,
      players,
      phase: state.players.length > 1 ? 'orderSelection' : 'playerTurn',
      currentPlayerIndex: 0,
    });

    if (state.players.length === 1) {
      get().startPlayerTurn();
    }
  },

  setPlayerOrder: (order) => {
    set({
      playerOrder: order,
      phase: 'playerTurn',
      currentPlayerIndex: 0,
    });
    get().startPlayerTurn();
  },

  startPlayerTurn: () => {
    const state = get();
    const pIdx = state.playerOrder[state.currentPlayerIndex];
    const players = [...state.players];
    const player = { ...players[pIdx] };

    // Gain 1 mana
    player.mana += 1;

    // Apply bleed
    const bleed = player.statusEffects.find(e => e.type === 'bleed');
    if (bleed && bleed.type === 'bleed') {
      player.hp -= bleed.value;
      get().addLog(`${player.name}이(가) 출혈로 ${bleed.value} 피해를 받습니다.`, 'damage');
    }

    // Draw cards
    const drawAmount = Math.max(0, state.drawCount - player.drawReduction);
    players[pIdx] = player;
    set({ players, placedOnOtherThisTurn: false });
    get().drawCards(pIdx, drawAmount);

    get().addLog(`--- ${player.name}의 턴 ---`, 'phase');
  },

  drawCards: (playerIndex, count) =>
    set((state) => {
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      let deck = [...p.deck];
      const hand = [...p.hand];
      let discard = [...p.discardPile];

      for (let i = 0; i < count; i++) {
        if (deck.length === 0) {
          if (discard.length === 0) break;
          deck = shuffle(discard, state.tutorialMode);
          discard = [];
        }
        hand.push(deck.shift()!);
      }

      p.deck = deck;
      p.hand = hand;
      p.discardPile = discard;
      players[playerIndex] = p;
      return { players };
    }),

  placeCardOnMagicLine: (cardInstanceId, magicLineIndex, targetPlayerIndex) =>
    set((state) => {
      const pIdx = state.playerOrder[state.currentPlayerIndex];
      const isOtherPlayer = targetPlayerIndex !== undefined && targetPlayerIndex !== pIdx;

      if (isOtherPlayer && state.placedOnOtherThisTurn) return state;

      const players = [...state.players];
      const currentPlayer = { ...players[pIdx] };
      const cardIdx = currentPlayer.hand.findIndex(c => c.instanceId === cardInstanceId);
      if (cardIdx === -1) return state;

      const card = currentPlayer.hand[cardIdx];
      currentPlayer.hand = currentPlayer.hand.filter((_, i) => i !== cardIdx);

      const targetIdx = targetPlayerIndex ?? pIdx;
      const targetPlayer = targetIdx === pIdx ? currentPlayer : { ...players[targetIdx] };
      const lines = [...targetPlayer.magicLines] as [MagicLine, MagicLine, MagicLine];
      lines[magicLineIndex] = {
        ...lines[magicLineIndex],
        cards: [...lines[magicLineIndex].cards, { ...card, ownerId: targetPlayer.id }],
      };
      targetPlayer.magicLines = lines;

      players[pIdx] = currentPlayer;
      if (targetIdx !== pIdx) players[targetIdx] = targetPlayer;

      return {
        players,
        placedOnOtherThisTurn: isOtherPlayer ? true : state.placedOnOtherThisTurn,
      };
    }),

  removeCardFromMagicLine: (magicLineIndex, cardIndex) =>
    set((state) => {
      const pIdx = state.playerOrder[state.currentPlayerIndex];
      const players = [...state.players];
      const p = { ...players[pIdx] };
      const lines = [...p.magicLines] as [MagicLine, MagicLine, MagicLine];
      const line = { ...lines[magicLineIndex] };
      const removedCard = line.cards[cardIndex];
      line.cards = line.cards.filter((_, i) => i !== cardIndex);
      lines[magicLineIndex] = line;
      p.magicLines = lines;
      p.hand = [...p.hand, removedCard];
      players[pIdx] = p;
      return { players };
    }),

  castMagicLine: (magicLineIndex) => {
    const state = get();
    const pIdx = state.playerOrder[state.currentPlayerIndex];
    const player = state.players[pIdx];
    const line = player.magicLines[magicLineIndex];

    if (line.cards.length === 0) return null;

    const cards = line.cards.map(ci => getCardById(ci.cardId)!).filter(Boolean);
    const result = evaluateMagicLine(cards);

    if (!result) {
      get().addLog('수식이 올바르지 않습니다.', 'info');
      return null;
    }

    const totalPower = result.power + line.imprintPower;

    get().addLog(
      `${player.name}이(가) 마법열 ${magicLineIndex + 1}을 시전: ${result.value}(${'*'.repeat(totalPower)})`,
      'action'
    );

    // Move cards (and equals card if any) to discard
    set((st) => {
      const players = [...st.players];
      const p = { ...players[pIdx] };
      const lineCards = p.magicLines[magicLineIndex].cards;
      const equalsCard = p.magicLines[magicLineIndex].equalsCard;
      const lines = [...p.magicLines] as [MagicLine, MagicLine, MagicLine];

      lineCards.forEach(ci => {
        const ownerIdx = players.findIndex(pl => pl.id === ci.ownerId);
        if (ownerIdx >= 0 && ownerIdx !== pIdx) {
          const owner = { ...players[ownerIdx] };
          owner.discardPile = [...owner.discardPile, ci];
          players[ownerIdx] = owner;
        } else {
          p.discardPile = [...p.discardPile, ci];
        }
      });

      if (equalsCard) {
        p.discardPile = [...p.discardPile, equalsCard];
      }

      lines[magicLineIndex] = { cards: [], imprintPower: 0, equalsCard: null };
      p.magicLines = lines;
      players[pIdx] = p;
      return { players };
    });

    return { value: result.value, power: totalPower };
  },

  placeEqualsCard: (cardInstanceId, magicLineIndex) =>
    set((state) => {
      const pIdx = state.playerOrder[state.currentPlayerIndex];
      const players = [...state.players];
      const p = { ...players[pIdx] };
      const cardIdx = p.hand.findIndex(c => c.instanceId === cardInstanceId);
      if (cardIdx === -1) return state;

      // If an equals card was previously placed, return it to hand
      const lines = [...p.magicLines] as [MagicLine, MagicLine, MagicLine];
      const existingEquals = lines[magicLineIndex].equalsCard;
      if (existingEquals) {
        p.hand = [...p.hand, existingEquals];
      }

      const card = p.hand[cardIdx];
      p.hand = p.hand.filter((_, i) => i !== cardIdx);

      lines[magicLineIndex] = { ...lines[magicLineIndex], equalsCard: card };
      p.magicLines = lines;
      players[pIdx] = p;
      return { players };
    }),

  removeEqualsCard: (magicLineIndex) =>
    set((state) => {
      const pIdx = state.playerOrder[state.currentPlayerIndex];
      const players = [...state.players];
      const p = { ...players[pIdx] };
      const lines = [...p.magicLines] as [MagicLine, MagicLine, MagicLine];
      const equalsCard = lines[magicLineIndex].equalsCard;
      if (!equalsCard) return state;
      p.hand = [...p.hand, equalsCard];
      lines[magicLineIndex] = { ...lines[magicLineIndex], equalsCard: null };
      p.magicLines = lines;
      players[pIdx] = p;
      return { players };
    }),

  equalsCast: (cardInstanceId, magicLineIndex) => {
    // If card not already placed as equals, place it now
    const state = get();
    const pIdx = state.playerOrder[state.currentPlayerIndex];
    const player = state.players[pIdx];
    const line = player.magicLines[magicLineIndex];

    if (!line.equalsCard || line.equalsCard.instanceId !== cardInstanceId) {
      get().placeEqualsCard(cardInstanceId, magicLineIndex);
    }

    get().addLog(`${player.name}이(가) 등호 시전!`, 'action');

    return get().castMagicLine(magicLineIndex);
  },

  useArtifact: (cardInstanceId) =>
    set((state) => {
      const pIdx = state.playerOrder[state.currentPlayerIndex];
      const players = [...state.players];
      const p = { ...players[pIdx] };
      const cardIdx = p.hand.findIndex(c => c.instanceId === cardInstanceId);
      if (cardIdx === -1) return state;
      const ci = p.hand[cardIdx];
      const card = getCardById(ci.cardId);
      if (!card || card.cardType !== 'artifact') return state;

      p.hand = p.hand.filter((_, i) => i !== cardIdx);
      p.discardPile = [...p.discardPile, ci];

      get().addLog(`${p.name}이(가) ${card.name}을(를) 사용`, 'action');

      players[pIdx] = p;
      return { players };
    }),

  useEquipment: (equipmentId) => {
    const state = get();
    const pIdx = state.playerOrder[state.currentPlayerIndex];
    if (pIdx === undefined) return false;
    const player = state.players[pIdx];
    if (!player) return false;

    // Find equipment in any slot
    const allEquips: EquipmentDef[] = [
      player.equipment.hat,
      player.equipment.robe,
      player.equipment.leftHand,
      player.equipment.rightHand,
      ...player.equipment.accessories,
    ].filter(Boolean) as EquipmentDef[];

    const equip = allEquips.find(e => e.id === equipmentId);
    if (!equip || !equip.activeUse) return false;

    // Check usage availability
    const usage = equip.activeUse;
    const wasUsed = player.equipmentUsedThisScenario.includes(equipmentId);

    if ((usage.cost.type === 'oncePerScenario' || usage.cost.type === 'oncePerScenarioPermanent') && wasUsed) {
      get().addLog(`${equip.name}은(는) 이미 사용했습니다.`, 'info');
      return false;
    }

    if (usage.cost.type === 'mana' && player.mana < usage.cost.amount) {
      get().addLog(`마나가 부족합니다. (필요: ${usage.cost.amount})`, 'info');
      return false;
    }

    // Apply cost and effect
    set((st) => {
      const players = [...st.players];
      const p = { ...players[pIdx] };

      if (usage.cost.type === 'mana') {
        p.mana -= usage.cost.amount;
      }
      if (usage.cost.type === 'oncePerScenario' || usage.cost.type === 'oncePerScenarioPermanent') {
        p.equipmentUsedThisScenario = [...p.equipmentUsedThisScenario, equipmentId];
      }

      // Apply specific effects
      switch (equip.effectId) {
        case 'old-shield': {
          // Charge a one-time damage reduction
          players[pIdx] = p;
          get().addLog(`${equip.name}: 다음 피해 -1 충전`, 'effect');
          return { players, pendingDamageReduction: st.pendingDamageReduction + 1 };
        }
        case 'small-fire-potion': {
          const newCard = createCardInstance('elem-fire-3-1', p.id);
          p.hand = [...p.hand, newCard];
          get().addLog(`${equip.name}: 불(3★)을 손에 추가`, 'effect');
          break;
        }
        case 'fire-potion': {
          for (let i = 0; i < 2; i++) {
            p.hand = [...p.hand, createCardInstance('elem-fire-3-1', p.id)];
          }
          get().addLog(`${equip.name}: 불(3★) 두 장 추가`, 'effect');
          break;
        }
        case 'life-potion': {
          p.hand = [...p.hand, createCardInstance('elem-life-2-1', p.id)];
          p.hp = Math.min(p.maxHp, p.hp + 3);
          get().addLog(`${equip.name}: 체력 +3, 생명(2★) 한 장 추가`, 'effect');
          break;
        }
        case 'wind-potion': {
          p.hand = [...p.hand, createCardInstance('elem-air-4-1', p.id)];
          players[pIdx] = p;
          get().drawCards(pIdx, 1);
          get().addLog(`${equip.name}: 공기(4★) 추가, 카드 1장 드로우`, 'effect');
          return { players: get().players };
        }
        case 'frost-potion': {
          p.mana += 2;
          p.hand = [...p.hand, createCardInstance('elem-water-5-1', p.id)];
          get().addLog(`${equip.name}: 마나 +2, 물(5★) 한 장 추가`, 'effect');
          break;
        }
        case 'earth-potion': {
          p.hand = [...p.hand, createCardInstance('elem-earth-6-1', p.id)];
          get().addLog(`${equip.name}: 흙(6★) 추가, 각인 1은 직접 적용해주세요`, 'effect');
          break;
        }
        case 'rune-potion': {
          p.hand = [...p.hand, createCardInstance('rune-plus', p.id)];
          p.hand = [...p.hand, createCardInstance('rune-multiply', p.id)];
          get().addLog(`${equip.name}: +룬, ×룬 한 장씩 추가`, 'effect');
          break;
        }
        case 'lightning-potion': {
          p.hand = [...p.hand, createCardInstance('elem-lightning-7-1', p.id)];
          get().addLog(`${equip.name}: 번개(7★) 한 장 추가, 7을 발동합니다`, 'effect');
          break;
        }
        case 'ether-potion': {
          get().addLog(`${equip.name}: 1~9 중 원하는 자연수를 영창합니다 (직접 처리)`, 'effect');
          break;
        }
        case 'amber-staff': {
          get().addLog(`${equip.name} 발동: 불(3) 포함 수식을 두 번 시전 (대상은 직접 선택)`, 'effect');
          break;
        }
        case 'feather-robe': {
          get().addLog(`${equip.name} 발동: 마법열의 카드 한 장을 손으로 회수 (직접 처리)`, 'effect');
          break;
        }
        default: {
          get().addLog(`${equip.name} 발동 (효과는 직접 적용)`, 'effect');
        }
      }

      players[pIdx] = p;
      return { players };
    });

    return true;
  },

  endPlayerTurn: () => {
    const state = get();
    const pIdx = state.playerOrder[state.currentPlayerIndex];

    // Enforce max hand size
    const player = state.players[pIdx];
    if (player.hand.length > state.maxHandSize) {
      get().addLog(`손패 제한 초과 - ${player.hand.length - state.maxHandSize}장을 버려야 합니다.`, 'info');
    }

    // Mark as acted
    set((st) => {
      const players = [...st.players];
      players[pIdx] = { ...players[pIdx], hasActedThisRound: true };
      return { players };
    });

    const nextIdx = state.currentPlayerIndex + 1;
    if (nextIdx < state.playerOrder.length) {
      set({ currentPlayerIndex: nextIdx });
      get().startPlayerTurn();
    } else {
      set({ phase: 'monsterAttack' });
      get().processMonsterAttacks();
    }
  },

  activateMagic: (value, power, targetType, targetId) => {
    const state = get();

    if (targetType === 'monster') {
      const slotIdx = state.monsterSlots.findIndex(
        s => s.activeMonster?.instanceId === targetId
      );
      if (slotIdx === -1) return false;

      const slot = state.monsterSlots[slotIdx];
      const monster = slot.activeMonster!;
      const def = getMonsterById(monster.defId)!;

      const vulnerable = monster.currentKeywords
        .filter(k => k.type === 'vulnerable')
        .reduce((sum, k) => sum + (k.type === 'vulnerable' ? k.value : 0), 0);
      const weakened = monster.currentKeywords
        .filter(k => k.type === 'weakened')
        .reduce((sum, k) => sum + (k.type === 'weakened' ? k.value : 0), 0);

      if (monster.shieldCount > 0) {
        if (value === 10) {
          set((st) => {
            const slots = [...st.monsterSlots];
            const m = { ...slots[slotIdx].activeMonster! };
            m.shieldCount -= 1;
            slots[slotIdx] = { ...slots[slotIdx], activeMonster: m };
            return { monsterSlots: slots };
          });
          get().addLog(`${def.name}의 보호막 파괴!`, 'effect');
          return true;
        }
        get().addLog(`${def.name}은(는) 보호막으로 보호됩니다. (10 발동으로 파괴)`, 'info');
        return false;
      }

      const soulResult = canDestroySoul(value, power, def.soulValue, def.soulPower, vulnerable, weakened);

      if (soulResult !== false) {
        if (Array.isArray(def.soulValue)) {
          const destroyedSoulVal = soulResult as number;
          set((st) => {
            const slots = [...st.monsterSlots];
            const m = { ...slots[slotIdx].activeMonster! };
            m.destroyedSouls = [...m.destroyedSouls, destroyedSoulVal];
            const allSouls = def.soulValue as number[];
            if (allSouls.every(sv => m.destroyedSouls.includes(sv))) {
              m.isDead = true;
              get().addLog(`${def.name} 처치!`, 'kill');
            } else {
              get().addLog(`${def.name}의 소울 ${destroyedSoulVal} 파괴! (${m.destroyedSouls.length}/${allSouls.length})`, 'effect');
            }
            slots[slotIdx] = { ...slots[slotIdx], activeMonster: m };
            return { monsterSlots: slots };
          });
        } else {
          set((st) => {
            const slots = [...st.monsterSlots];
            const m = { ...slots[slotIdx].activeMonster! };
            m.isDead = true;
            slots[slotIdx] = { ...slots[slotIdx], activeMonster: m };
            return { monsterSlots: slots };
          });
          get().addLog(`${def.name} 처치!`, 'kill');
        }
        return true;
      }

      get().addLog(`${def.name}에게 ${value}(${'*'.repeat(power)}) 발동 - 소울 파괴 실패`, 'info');
      return false;
    }

    return false;
  },

  defendAttack: (monsterInstanceId, magicLineIndex) => {
    const state = get();
    const slotIdx = state.monsterSlots.findIndex(
      s => s.activeMonster?.instanceId === monsterInstanceId
    );
    if (slotIdx === -1) return false;

    const monster = state.monsterSlots[slotIdx].activeMonster!;
    if (!monster.currentPattern) return false;

    const pattern = monster.currentPattern;
    if (!pattern.targetValue || !pattern.targetPower) return false;

    const pIdx = state.playerOrder[state.currentPlayerIndex];
    const player = state.players[pIdx];
    const line = player.magicLines[magicLineIndex];
    const cards = line.cards.map(ci => getCardById(ci.cardId)!).filter(Boolean);
    const result = evaluateMagicLine(cards);

    if (!result) return false;

    const totalPower = result.power + line.imprintPower;

    const vulnerable = monster.currentKeywords
      .filter(k => k.type === 'vulnerable')
      .reduce((sum, k) => sum + (k.type === 'vulnerable' ? k.value : 0), 0);
    const weakened = monster.currentKeywords
      .filter(k => k.type === 'weakened')
      .reduce((sum, k) => sum + (k.type === 'weakened' ? k.value : 0), 0);

    if (canDefendAttack(result.value, totalPower, pattern.targetValue, pattern.targetPower, vulnerable, weakened)) {
      get().addLog(`공격 방어 성공! (${result.value}, ${'*'.repeat(totalPower)})`, 'defense');
      return true;
    }

    return false;
  },

  processMonsterAttacks: () => {
    const state = get();
    const players = [...state.players];
    const monsterSlots = state.monsterSlots;
    let damageReduction = state.pendingDamageReduction;

    monsterSlots.forEach((slot) => {
      if (!slot.activeMonster || slot.activeMonster.isDead) return;
      const monster = slot.activeMonster;
      const pattern = monster.currentPattern;
      if (!pattern || !pattern.damage) return;

      const def = getMonsterById(monster.defId)!;
      const baseDamage = pattern.damage + monster.strengthenStacks;

      // Find target: unattacked player with earliest turn order
      let targetIdx = -1;
      const unattacked = state.playerOrder.filter(pi => !players[pi].hasBeenAttackedThisRound && players[pi].hp > 0);
      if (unattacked.length === 0) {
        players.forEach(p => { p.hasBeenAttackedThisRound = false; });
        const newUnattacked = state.playerOrder.filter(pi => players[pi].hp > 0);
        if (newUnattacked.length > 0) targetIdx = newUnattacked[0];
      } else {
        targetIdx = unattacked[0];
      }

      if (targetIdx === -1) return;

      const target = { ...players[targetIdx] };

      // Apply curse doubling
      const hasCurse = target.statusEffects.some(e => e.type === 'curse');
      let finalDamage = hasCurse ? baseDamage * 2 : baseDamage;

      // Apply damage reduction (e.g. 낡은 방패)
      if (damageReduction > 0 && finalDamage > 0) {
        const reduced = Math.min(damageReduction, finalDamage);
        finalDamage -= reduced;
        damageReduction -= reduced;
        get().addLog(`피해 ${reduced} 감소 (장비 효과)`, 'defense');
      }

      target.hp -= finalDamage;
      target.hasBeenAttackedThisRound = true;

      if (hasCurse) {
        target.statusEffects = target.statusEffects.filter(e => e.type !== 'curse');
      }

      // Apply pattern effects
      if (pattern.effectId === 'vagabond-dagger') {
        const existing = target.statusEffects.find(e => e.type === 'bleed');
        if (existing && existing.type === 'bleed') {
          existing.value += 1;
        } else {
          target.statusEffects.push({ type: 'bleed', value: 1 });
        }
      }
      if (pattern.effectId === 'shadow-harm') {
        target.drawReduction += 1;
      }

      players[targetIdx] = target;
      get().addLog(
        `${def.name}의 ${pattern.name}! ${target.name}에게 ${finalDamage} 피해${hasCurse ? ' (저주 2배)' : ''}`,
        'damage'
      );

      // Secondary attack
      if (pattern.secondaryDamage) {
        const targetReload = { ...players[targetIdx] };
        let secDamage = pattern.secondaryDamage;
        if (damageReduction > 0 && secDamage > 0) {
          const reduced = Math.min(damageReduction, secDamage);
          secDamage -= reduced;
          damageReduction -= reduced;
        }
        targetReload.hp -= secDamage;
        players[targetIdx] = targetReload;
        get().addLog(
          `${def.name}의 추가 공격! ${target.name}에게 ${secDamage} 피해`,
          'damage'
        );
      }
    });

    // Discard monster pattern cards (skip for tutorial since we always use first pattern)
    const updatedSlots = monsterSlots.map(slot => {
      if (!slot.activeMonster) return slot;
      if (state.tutorialMode) {
        // Keep pattern for next round (tutorial always uses first pattern)
        return slot;
      }
      const m = { ...slot.activeMonster };
      if (m.currentPattern) {
        m.patternDiscard = [...m.patternDiscard, m.currentPattern];
        m.currentPattern = null;
      }
      return { ...slot, activeMonster: m };
    });

    set({
      players,
      monsterSlots: updatedSlots,
      phase: 'roundEnd',
      pendingDamageReduction: damageReduction,
    });
    get().addLog('몬스터 공격 종료', 'phase');

    // Check game end
    const endResult = get().checkGameEnd();
    if (endResult === 'defeat') {
      set({ phase: 'defeat' });
      get().addLog('패배...', 'phase');
    } else if (endResult === 'victory') {
      set({ phase: 'victory' });
      get().addLog('승리!', 'phase');
    } else {
      get().spawnNextMonsters();
    }
  },

  spawnNextMonsters: () =>
    set((state) => {
      const monsterSlots = state.monsterSlots.map((slot, si) => {
        if (slot.activeMonster && !slot.activeMonster.isDead) return slot;
        if (slot.activeMonster?.isDead && slot.queue.length > 0) {
          const queue = [...slot.queue];
          const nextId = queue.shift()!;
          get().addLog(`슬롯 ${si + 1}에 ${getMonsterById(nextId)?.name} 등장!`, 'info');
          return {
            queue,
            activeMonster: createMonsterInstance(nextId, si, state.tutorialMode),
          };
        }
        if (!slot.activeMonster && slot.queue.length > 0) {
          const queue = [...slot.queue];
          const nextId = queue.shift()!;
          return {
            queue,
            activeMonster: createMonsterInstance(nextId, si, state.tutorialMode),
          };
        }
        return slot;
      });
      return { monsterSlots };
    }),

  checkGameEnd: () => {
    const state = get();
    const allPlayersDead = state.players.every(p => p.hp <= 0);
    if (allPlayersDead) return 'defeat';

    const allMonstersCleared = state.monsterSlots.every(
      slot => (!slot.activeMonster || slot.activeMonster.isDead) && slot.queue.length === 0
    );
    if (allMonstersCleared) return 'victory';

    return null;
  },

  getCurrentPlayer: () => {
    const state = get();
    if (state.phase !== 'playerTurn') return null;
    const pIdx = state.playerOrder[state.currentPlayerIndex];
    return state.players[pIdx] ?? null;
  },

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

  discardHand: (playerIndex) =>
    set((state) => {
      const players = [...state.players];
      const p = { ...players[playerIndex] };
      p.discardPile = [...p.discardPile, ...p.hand];
      p.hand = [];
      players[playerIndex] = p;
      return { players };
    }),
}));
