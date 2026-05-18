import type { CampaignConfig } from '../types';

export const tutorialCampaign: CampaignConfig = {
  players: [
    {
      name: '화염술사',
      hp: 6,
      deckCardIds: [
        'elem-life-2-1',
        'elem-life-2-1',
        'elem-fire-3-1',
        'elem-fire-3-1',
        'elem-fire-3-1',
        'elem-fire-3-1',
        'elem-fire-3-2',
        'elem-fire-3-2',
        'elem-water-5-1',
        'elem-water-5-1',
        'elem-water-5-1',
        'rune-plus',
        'rune-plus',
        'rune-plus',
        'rune-multiply',
        'rune-multiply',
        'rune-multiply',
        'art-fierce-flame',
        'art-heat-absorb',
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
    { queue: ['mon-wolf', 'mon-wolf'] },
    { queue: ['mon-wolf', 'mon-hunting-dog'] },
    { queue: ['mon-wolf'] },
  ],
};
