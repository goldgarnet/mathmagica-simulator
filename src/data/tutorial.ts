import type { CampaignConfig } from '../types';

// Tutorial uses fixed card draw order (top of deck drawn first).
// Per the spec, draws across 4 turns:
// T1: (2★) (3★) (3★★) (5★) (×)
// T2: (3★) (3★) (5★) (×) [맹렬한 불길]
// T3: (2★) (3★) (+) (+) [열기 흡수]
// T4: (3★★) (5★) (+) (×) [열기 흡수]
export const tutorialCampaign: CampaignConfig = {
  players: [
    {
      name: '화염술사',
      hp: 6,
      deckCardIds: [
        // Turn 1 draws
        'elem-life-2-1',
        'elem-fire-3-1',
        'elem-fire-3-2',
        'elem-water-5-1',
        'rune-multiply',
        // Turn 2 draws
        'elem-fire-3-1',
        'elem-fire-3-1',
        'elem-water-5-1',
        'rune-multiply',
        'art-fierce-flame',
        // Turn 3 draws
        'elem-life-2-1',
        'elem-fire-3-1',
        'rune-plus',
        'rune-plus',
        'art-heat-absorb',
        // Turn 4 draws
        'elem-fire-3-2',
        'elem-water-5-1',
        'rune-plus',
        'rune-multiply',
        'art-heat-absorb',
      ],
      equipment: {
        rightHand: 'equip-amber-staff',
        leftHand: 'equip-old-shield',
        accessories: ['equip-small-fire-potion'],
      },
    },
  ],
  monsterSlots: [
    { queue: ['mon-wolf'] },
    { queue: ['mon-wolf', 'mon-hunting-dog'] },
    { queue: ['mon-wolf', 'mon-wolf'] },
  ],
};
