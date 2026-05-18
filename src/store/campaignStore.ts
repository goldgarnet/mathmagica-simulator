import { create } from 'zustand';
import type { CampaignConfig } from '../types';
import { tutorialCampaign } from '../data/tutorial';

interface CampaignStore {
  config: CampaignConfig;
  setConfig: (config: CampaignConfig) => void;
  setPlayerCount: (count: number) => void;
  updatePlayer: (index: number, update: Partial<CampaignConfig['players'][0]>) => void;
  addCardToDeck: (playerIndex: number, cardId: string) => void;
  removeCardFromDeck: (playerIndex: number, cardIndex: number) => void;
  setEquipment: (playerIndex: number, slot: string, equipId: string | undefined) => void;
  addAccessory: (playerIndex: number, equipId: string) => void;
  removeAccessory: (playerIndex: number, accIndex: number) => void;
  addMonsterSlot: () => void;
  removeMonsterSlot: (slotIndex: number) => void;
  addMonsterToSlot: (slotIndex: number, monsterId: string) => void;
  removeMonsterFromSlot: (slotIndex: number, queueIndex: number) => void;
  reorderMonsterInSlot: (slotIndex: number, fromIndex: number, toIndex: number) => void;
  moveMonsterBetweenSlots: (fromSlotIndex: number, fromQueueIndex: number, toSlotIndex: number, toQueueIndex: number) => void;
  reorderMonsterSlots: (fromIndex: number, toIndex: number) => void;
  reorderDeckCard: (playerIndex: number, fromIndex: number, toIndex: number) => void;
  reorderAccessory: (playerIndex: number, fromIndex: number, toIndex: number) => void;
  loadTutorial: () => void;
}

const defaultConfig: CampaignConfig = {
  players: [
    {
      name: '플레이어 1',
      hp: 6,
      deckCardIds: [],
      equipment: { accessories: [] },
    },
  ],
  monsterSlots: [{ queue: [] }],
};

export const useCampaignStore = create<CampaignStore>((set) => ({
  config: { ...defaultConfig },

  setConfig: (config) => set({ config }),

  setPlayerCount: (count) =>
    set((state) => {
      const players = [...state.config.players];
      while (players.length < count) {
        players.push({
          name: `플레이어 ${players.length + 1}`,
          hp: 6,
          deckCardIds: [],
          equipment: { accessories: [] },
        });
      }
      while (players.length > count) players.pop();
      return { config: { ...state.config, players } };
    }),

  updatePlayer: (index, update) =>
    set((state) => {
      const players = [...state.config.players];
      players[index] = { ...players[index], ...update };
      return { config: { ...state.config, players } };
    }),

  addCardToDeck: (playerIndex, cardId) =>
    set((state) => {
      const players = [...state.config.players];
      const p = { ...players[playerIndex] };
      p.deckCardIds = [...p.deckCardIds, cardId];
      players[playerIndex] = p;
      return { config: { ...state.config, players } };
    }),

  removeCardFromDeck: (playerIndex, cardIndex) =>
    set((state) => {
      const players = [...state.config.players];
      const p = { ...players[playerIndex] };
      p.deckCardIds = p.deckCardIds.filter((_, i) => i !== cardIndex);
      players[playerIndex] = p;
      return { config: { ...state.config, players } };
    }),

  setEquipment: (playerIndex, slot, equipId) =>
    set((state) => {
      const players = [...state.config.players];
      const p = { ...players[playerIndex], equipment: { ...players[playerIndex].equipment } };
      if (slot === 'hat' || slot === 'robe' || slot === 'leftHand' || slot === 'rightHand') {
        (p.equipment as any)[slot] = equipId;
      }
      players[playerIndex] = p;
      return { config: { ...state.config, players } };
    }),

  addAccessory: (playerIndex, equipId) =>
    set((state) => {
      const players = [...state.config.players];
      const p = { ...players[playerIndex], equipment: { ...players[playerIndex].equipment } };
      p.equipment.accessories = [...p.equipment.accessories, equipId];
      players[playerIndex] = p;
      return { config: { ...state.config, players } };
    }),

  removeAccessory: (playerIndex, accIndex) =>
    set((state) => {
      const players = [...state.config.players];
      const p = { ...players[playerIndex], equipment: { ...players[playerIndex].equipment } };
      p.equipment.accessories = p.equipment.accessories.filter((_, i) => i !== accIndex);
      players[playerIndex] = p;
      return { config: { ...state.config, players } };
    }),

  addMonsterSlot: () =>
    set((state) => ({
      config: {
        ...state.config,
        monsterSlots: [...state.config.monsterSlots, { queue: [] }],
      },
    })),

  removeMonsterSlot: (slotIndex) =>
    set((state) => ({
      config: {
        ...state.config,
        monsterSlots: state.config.monsterSlots.filter((_, i) => i !== slotIndex),
      },
    })),

  addMonsterToSlot: (slotIndex, monsterId) =>
    set((state) => {
      const slots = [...state.config.monsterSlots];
      slots[slotIndex] = { queue: [...slots[slotIndex].queue, monsterId] };
      return { config: { ...state.config, monsterSlots: slots } };
    }),

  removeMonsterFromSlot: (slotIndex, queueIndex) =>
    set((state) => {
      const slots = [...state.config.monsterSlots];
      slots[slotIndex] = {
        queue: slots[slotIndex].queue.filter((_, i) => i !== queueIndex),
      };
      return { config: { ...state.config, monsterSlots: slots } };
    }),

  reorderMonsterInSlot: (slotIndex, fromIndex, toIndex) =>
    set((state) => {
      const slots = [...state.config.monsterSlots];
      const queue = [...slots[slotIndex].queue];
      const [moved] = queue.splice(fromIndex, 1);
      queue.splice(toIndex, 0, moved);
      slots[slotIndex] = { queue };
      return { config: { ...state.config, monsterSlots: slots } };
    }),

  moveMonsterBetweenSlots: (fromSlotIndex, fromQueueIndex, toSlotIndex, toQueueIndex) =>
    set((state) => {
      const slots = [...state.config.monsterSlots];
      const fromQueue = [...slots[fromSlotIndex].queue];
      const [moved] = fromQueue.splice(fromQueueIndex, 1);
      slots[fromSlotIndex] = { queue: fromQueue };
      const toQueue = fromSlotIndex === toSlotIndex ? fromQueue : [...slots[toSlotIndex].queue];
      toQueue.splice(toQueueIndex, 0, moved);
      slots[toSlotIndex] = { queue: toQueue };
      return { config: { ...state.config, monsterSlots: slots } };
    }),

  reorderMonsterSlots: (fromIndex, toIndex) =>
    set((state) => {
      const slots = [...state.config.monsterSlots];
      const [moved] = slots.splice(fromIndex, 1);
      slots.splice(toIndex, 0, moved);
      return { config: { ...state.config, monsterSlots: slots } };
    }),

  reorderDeckCard: (playerIndex, fromIndex, toIndex) =>
    set((state) => {
      const players = [...state.config.players];
      const p = { ...players[playerIndex] };
      const deck = [...p.deckCardIds];
      const [moved] = deck.splice(fromIndex, 1);
      deck.splice(toIndex, 0, moved);
      p.deckCardIds = deck;
      players[playerIndex] = p;
      return { config: { ...state.config, players } };
    }),

  reorderAccessory: (playerIndex, fromIndex, toIndex) =>
    set((state) => {
      const players = [...state.config.players];
      const p = { ...players[playerIndex], equipment: { ...players[playerIndex].equipment } };
      const accs = [...p.equipment.accessories];
      const [moved] = accs.splice(fromIndex, 1);
      accs.splice(toIndex, 0, moved);
      p.equipment.accessories = accs;
      players[playerIndex] = p;
      return { config: { ...state.config, players } };
    }),

  loadTutorial: () => set({ config: JSON.parse(JSON.stringify(tutorialCampaign)) }),
}));
