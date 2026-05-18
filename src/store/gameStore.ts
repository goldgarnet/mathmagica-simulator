import { create } from 'zustand';
import type {
  PlayerState, MonsterInstance, MonsterSlot, GamePhase,
  GameLogEntry, CampaignConfig, CardInstance, MagicLine,
} from '../types';
import { getCardById, getEquipmentById } from '../data/cards';
import { getMonsterById } from '../data/monsters';
import { evaluateMagicLine, canDestroySoul, canDefendAttack } from '../engine/formula';

let nextInstanceId = 1;
function genId(): string { return `inst-${nextInstanceId++}`; }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createCardInstance(cardId: string, ownerId: string): CardInstance {
  return { instanceId: genId(), cardId, ownerId };
}

function createMonsterInstance(defId: string, slotIndex: number): MonsterInstance {
  const def = getMonsterById(defId)!;
  const patternDeck = shuffle([...def.patternDeck]);
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

  initGame: (config: CampaignConfig) => void;
  addLog: (message: string, type: GameLogEntry['type']) => void;

  // Round flow
  startRound: () => void;
  setPlayerOrder: (order: number[]) => void;
  startPlayerTurn: () => void;

  // Player actions
  drawCards: (playerIndex: number, count: number) => void;
  placeCardOnMagicLine: (cardInstanceId: string, magicLineIndex: number, targetPlayerIndex?: number) => void;
  removeCardFromMagicLine: (magicLineIndex: number, cardIndex: number) => void;
  castMagicLine: (magicLineIndex: number) => void;
  equalsCast: (cardInstanceId: string, magicLineIndex: number) => void;
  useArtifact: (cardInstanceId: string) => void;
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

  initGame: (config) => {
    nextInstanceId = 1;
    const players: PlayerState[] = config.players.map((pc, i) => {
      const deck = shuffle(pc.deckCardIds.map(cid => createCardInstance(cid, `player-${i}`)));

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
          { cards: [], imprintPower: 0 },
          { cards: [], imprintPower: 0 },
          { cards: [], imprintPower: 0 },
        ] as [MagicLine, MagicLine, MagicLine],
        equipment: {
          hat: pc.equipment.hat ? (getEquipmentById(pc.equipment.hat)) : null,
          robe: pc.equipment.robe ? (getEquipmentById(pc.equipment.robe)) : null,
          leftHand: pc.equipment.leftHand ? (getEquipmentById(pc.equipment.leftHand)) : null,
          rightHand: pc.equipment.rightHand ? (getEquipmentById(pc.equipment.rightHand)) : null,
          accessories: pc.equipment.accessories.map(id => getEquipmentById(id)).filter(Boolean) as any[],
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
        activeMonster = createMonsterInstance(firstId, si);
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
    });
  },

  addLog: (message, type) =>
    set((state) => ({
      log: [...state.log, { timestamp: Date.now(), message, type }],
    })),

  startRound: () => {
    const state = get();
    const newRound = state.round + 1;

    // Draw pattern cards for each active monster
    const monsterSlots = state.monsterSlots.map(slot => {
      if (!slot.activeMonster || slot.activeMonster.isDead) return slot;
      const m = { ...slot.activeMonster };
      if (m.patternDeck.length === 0) {
        m.patternDeck = shuffle([...m.patternDiscard]);
        m.patternDiscard = [];
      }
      if (m.patternDeck.length > 0) {
        m.currentPattern = m.patternDeck[0];
        m.patternDeck = m.patternDeck.slice(1);
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
      let hand = [...p.hand];
      let discard = [...p.discardPile];

      for (let i = 0; i < count; i++) {
        if (deck.length === 0) {
          if (discard.length === 0) break;
          deck = shuffle(discard);
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

    if (line.cards.length === 0) return;

    const cards = line.cards.map(ci => getCardById(ci.cardId)!).filter(Boolean);
    const result = evaluateMagicLine(cards);

    if (!result) {
      get().addLog('수식이 올바르지 않습니다.', 'info');
      return;
    }

    const totalPower = result.power + line.imprintPower;

    get().addLog(
      `${player.name}이(가) 마법열 ${magicLineIndex + 1}을 시전: ${result.value}(${'*'.repeat(totalPower)})`,
      'action'
    );

    // Move cards to discard
    set((st) => {
      const players = [...st.players];
      const p = { ...players[pIdx] };
      const lineCards = p.magicLines[magicLineIndex].cards;
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

      lines[magicLineIndex] = { cards: [], imprintPower: 0 };
      p.magicLines = lines;
      players[pIdx] = p;
      return { players };
    });

    return { value: result.value, power: totalPower };
  },

  equalsCast: (cardInstanceId, magicLineIndex) => {
    const state = get();
    const pIdx = state.playerOrder[state.currentPlayerIndex];

    // Remove the card from hand and discard it (not part of formula)
    set((st) => {
      const players = [...st.players];
      const p = { ...players[pIdx] };
      const cardIdx = p.hand.findIndex(c => c.instanceId === cardInstanceId);
      if (cardIdx === -1) return st;
      const card = p.hand[cardIdx];
      p.hand = p.hand.filter((_, i) => i !== cardIdx);
      p.discardPile = [...p.discardPile, card];
      players[pIdx] = p;
      return { players };
    });

    get().addLog(`${state.players[pIdx].name}이(가) 등호 시전!`, 'action');
    get().castMagicLine(magicLineIndex);
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

    monsterSlots.forEach((slot) => {
      if (!slot.activeMonster || slot.activeMonster.isDead) return;
      const monster = slot.activeMonster;
      const pattern = monster.currentPattern;
      if (!pattern || !pattern.damage) return;

      const def = getMonsterById(monster.defId)!;
      const totalDamage = pattern.damage + monster.strengthenStacks;

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
      const finalDamage = hasCurse ? totalDamage * 2 : totalDamage;

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
        target.hp -= pattern.secondaryDamage;
        get().addLog(
          `${def.name}의 추가 공격! ${target.name}에게 ${pattern.secondaryDamage} 피해`,
          'damage'
        );
      }
    });

    // Discard monster pattern cards
    const updatedSlots = monsterSlots.map(slot => {
      if (!slot.activeMonster) return slot;
      const m = { ...slot.activeMonster };
      if (m.currentPattern) {
        m.patternDiscard = [...m.patternDiscard, m.currentPattern];
        m.currentPattern = null;
      }
      return { ...slot, activeMonster: m };
    });

    set({ players, monsterSlots: updatedSlots, phase: 'roundEnd' });
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
      // Auto-start next round after brief delay
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
            activeMonster: createMonsterInstance(nextId, si),
          };
        }
        if (!slot.activeMonster && slot.queue.length > 0) {
          const queue = [...slot.queue];
          const nextId = queue.shift()!;
          return {
            queue,
            activeMonster: createMonsterInstance(nextId, si),
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

