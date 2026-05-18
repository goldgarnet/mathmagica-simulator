import type { MonsterDef } from '../types';

export const monsterDefs: MonsterDef[] = [
  {
    id: 'mon-wolf',
    name: '늑대',
    tier: 'I',
    soulValue: 15,
    soulPower: 3,
    keywords: [],
    patternDeck: [
      {
        name: '물기',
        targetValue: 2, targetPower: 1,
        damage: 2,
        effectDescription: '2 데미지',
        effectId: 'wolf-bite',
      },
      {
        name: '대기하기',
        damage: 0,
        effectDescription: '아무 행동도 하지 않습니다.',
        effectId: 'wolf-wait',
      },
    ],
  },
  {
    id: 'mon-hunting-dog',
    name: '사냥개',
    tier: 'I',
    soulValue: 9,
    soulPower: 2,
    keywords: [],
    patternDeck: [
      {
        name: '물기',
        targetValue: 4, targetPower: 1,
        damage: 3,
        effectDescription: '3 데미지',
        effectId: 'dog-bite',
      },
      {
        name: '대기하기',
        damage: 0,
        effectDescription: '아무 행동도 하지 않습니다.',
        effectId: 'dog-wait',
      },
    ],
  },
  {
    id: 'mon-vagabond',
    name: '부랑자',
    tier: 'I',
    soulValue: 12,
    soulPower: 3,
    keywords: [],
    patternDeck: [
      {
        name: '단검 투척',
        targetValue: 5, targetPower: 1,
        damage: 1,
        effectDescription: '1 데미지, 출혈 1',
        effectId: 'vagabond-dagger',
      },
      {
        name: '대기하기',
        damage: 0,
        effectDescription: '아무 행동도 하지 않습니다.',
        effectId: 'vagabond-wait',
      },
    ],
  },
  {
    id: 'mon-red-shaman',
    name: '붉은 모자 주술사',
    tier: 'II',
    soulValue: 21,
    soulPower: 4,
    keywords: [],
    patternDeck: [
      {
        name: '화염 방패',
        damage: 0,
        effectDescription: '가장 가까운 다른 몬스터에게 3 면역을 부여합니다.',
        effectId: 'shaman-fire-shield',
      },
      {
        name: '화염살',
        targetValue: 7, targetPower: 2,
        damage: 3,
        effectDescription: '3 데미지',
        effectId: 'shaman-fire-arrow',
      },
      {
        name: '이연격',
        targetValue: 3, targetPower: 1,
        damage: 2,
        secondaryTargetValue: 4, secondaryTargetPower: 1,
        secondaryDamage: 2,
        effectDescription: '2 데미지 + 2 데미지',
        effectId: 'shaman-double-strike',
      },
    ],
  },
  {
    id: 'mon-brass-golem',
    name: '놋쇠 골렘',
    tier: 'II',
    soulValue: 7,
    soulPower: 1,
    keywords: [{ type: 'shield', count: 1 }],
    patternDeck: [
      {
        name: '충전',
        damage: 0,
        effectDescription: '강화 1. 보호막이 제거되면 추가 공격을 얻습니다.',
        effectId: 'golem-charge',
      },
      {
        name: '주먹 휘두르기',
        targetValue: 8, targetPower: 3,
        damage: 3,
        effectDescription: '3 데미지',
        effectId: 'golem-punch',
      },
    ],
    specialRules: '보호막이 제거되면 추가 공격을 얻습니다.',
  },
  {
    id: 'mon-shadow',
    name: '그림자',
    tier: 'III',
    soulValue: 1,
    soulPower: 0,
    keywords: [],
    patternDeck: [
      {
        name: '저주의 손길',
        damage: 0,
        effectDescription: '강화 1 + 가장 가까운 플레이어를 저주',
        effectId: 'shadow-curse',
      },
      {
        name: '해악',
        targetValue: 13, targetPower: 3,
        damage: 4,
        effectDescription: '4 데미지. 피격받은 플레이어는 드로우 1 감소',
        effectId: 'shadow-harm',
      },
    ],
  },
];

export const bossDefs: MonsterDef[] = [
  {
    id: 'boss-wolf-trainer',
    name: '늑대조련사',
    tier: 'boss',
    soulValue: 30,
    soulPower: 5,
    keywords: [],
    patternDeck: [
      {
        name: '산탄총',
        damage: 5,
        effectDescription: '모든 플레이어에게 5 데미지',
        effectId: 'trainer-shotgun',
      },
      {
        name: '물어라',
        damage: 4,
        effectDescription: '4+4 데미지 (늑대 수에 비례)',
        effectId: 'trainer-bite-command',
      },
      {
        name: '지휘자의 부름',
        damage: 0,
        effectDescription: '궁극기: 늑대 소환, 강화 2 획득',
        effectId: 'trainer-summon',
      },
    ],
    specialRules: '전장에 늑대가 남아 있는 동안 무적입니다. 전투 시작 시 플레이어 수만큼 늑대를 소환합니다.',
  },
  {
    id: 'boss-twin-dark',
    name: '쌍둥이 기사 - 칠흑',
    tier: 'boss',
    soulValue: [10, 30, 50, 70, 90],
    soulPower: 4,
    keywords: [],
    patternDeck: [
      {
        name: '사령 의식',
        damage: 0,
        effectDescription: '궁극기',
        effectId: 'twin-dark-ultimate',
      },
      {
        name: '암흑 참격',
        targetValue: 15, targetPower: 3,
        damage: 4,
        effectDescription: '4 데미지',
        effectId: 'twin-dark-slash',
      },
    ],
    specialRules: '저주 면역. 소울 5개 (10, 30, 50, 70, 90) 모두 파괴 시 처치.',
  },
  {
    id: 'boss-twin-light',
    name: '쌍둥이 기사 - 광휘',
    tier: 'boss',
    soulValue: [20, 40, 60, 80, 100],
    soulPower: 4,
    keywords: [],
    patternDeck: [
      {
        name: '영혼 난격',
        damage: 0,
        effectDescription: '궁극기',
        effectId: 'twin-light-ultimate',
      },
      {
        name: '광휘 참격',
        targetValue: 20, targetPower: 3,
        damage: 3,
        effectDescription: '3 데미지',
        effectId: 'twin-light-slash',
      },
    ],
    specialRules: '보호막 회복. 소울 5개 (20, 40, 60, 80, 100) 모두 파괴 시 처치.',
  },
];

export function getAllMonsters(): MonsterDef[] {
  return [...monsterDefs, ...bossDefs];
}

export function getMonsterById(id: string): MonsterDef | undefined {
  return getAllMonsters().find(m => m.id === id);
}
