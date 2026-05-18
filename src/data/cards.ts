import type { ElementCard, RuneCard, ArtifactCard, EquipmentDef } from '../types';

export const elementCards: ElementCard[] = [
  { cardType: 'element', id: 'elem-life-2-1', name: '생명', elementName: 'life', value: 2, power: 1 },
  { cardType: 'element', id: 'elem-life-2-2', name: '생명', elementName: 'life', value: 2, power: 2 },
  { cardType: 'element', id: 'elem-fire-3-1', name: '불', elementName: 'fire', value: 3, power: 1 },
  { cardType: 'element', id: 'elem-fire-3-2', name: '불', elementName: 'fire', value: 3, power: 2 },
  { cardType: 'element', id: 'elem-fire-3-3', name: '불', elementName: 'fire', value: 3, power: 3 },
  { cardType: 'element', id: 'elem-air-4-1', name: '공기', elementName: 'air', value: 4, power: 1 },
  { cardType: 'element', id: 'elem-air-4-2', name: '공기', elementName: 'air', value: 4, power: 2 },
  { cardType: 'element', id: 'elem-water-5-1', name: '물', elementName: 'water', value: 5, power: 1 },
  { cardType: 'element', id: 'elem-water-5-2', name: '물', elementName: 'water', value: 5, power: 2 },
  { cardType: 'element', id: 'elem-earth-6-1', name: '흙', elementName: 'earth', value: 6, power: 1 },
  { cardType: 'element', id: 'elem-earth-6-2', name: '흙', elementName: 'earth', value: 6, power: 2 },
  { cardType: 'element', id: 'elem-lightning-7-1', name: '번개', elementName: 'lightning', value: 7, power: 1 },
  { cardType: 'element', id: 'elem-lightning-7-2', name: '번개', elementName: 'lightning', value: 7, power: 2 },
  { cardType: 'element', id: 'elem-void-0-1', name: '공허', elementName: 'void', value: 0, power: 1 },
  { cardType: 'element', id: 'elem-light-1-1', name: '빛', elementName: 'light', value: 1, power: 1 },
];

export const runeCards: RuneCard[] = [
  { cardType: 'rune', id: 'rune-plus', name: '더하기', symbol: '+' },
  { cardType: 'rune', id: 'rune-multiply', name: '곱하기', symbol: '*' },
  { cardType: 'rune', id: 'rune-minus', name: '빼기', symbol: '-' },
];

export const artifactCards: ArtifactCard[] = [
  {
    cardType: 'artifact', id: 'art-efficiency-scroll', name: '효율 스크롤',
    value: 2, power: 1, rarity: 'common',
    effectDescription: '마법열 하나를 시전합니다. 카드들 중 두 장만 버린 카드 더미로 돌아갑니다.',
    effectId: 'efficiency-scroll',
  },
  {
    cardType: 'artifact', id: 'art-transform-scroll', name: '변형 스크롤',
    value: 5, power: 1, rarity: 'common',
    effectDescription: '마법열 하나를 시전합니다. 결과값을 1 또는 2만큼 바꿀 수 있습니다.',
    effectId: 'transform-scroll',
  },
  {
    cardType: 'artifact', id: 'art-pioneer-fan', name: '개척의 부채',
    value: 4, power: 1, rarity: 'common',
    effectDescription: '카드를 2장 뽑습니다.',
    effectId: 'pioneer-fan',
  },
  {
    cardType: 'artifact', id: 'art-bronze-pen', name: '청동 만년필',
    value: 3, power: 1, rarity: 'common',
    effectDescription: '각인 2',
    effectId: 'bronze-pen',
  },
  {
    cardType: 'artifact', id: 'art-lightning-orb', name: '번개 오브',
    power: 1, rarity: 'rare',
    effectDescription: '(손패에 있는 7 카드 수) +1장만큼 카드를 뽑습니다.',
    effectId: 'lightning-orb',
  },
  {
    cardType: 'artifact', id: 'art-weather-gauge', name: '기상 관측기',
    value: 7, power: 2, rarity: 'common', versatile: true,
    effectDescription: '다용도. 이번 턴에 수식 시전이 아닌 방법으로 발동한 마법 하나당 마나를 1 얻습니다.',
    effectId: 'weather-gauge',
  },
  {
    cardType: 'artifact', id: 'art-obsidian-blade', name: '흑요석 칼날',
    power: 1, rarity: 'epic',
    effectDescription: '각인 3',
    effectId: 'obsidian-blade',
  },
  {
    cardType: 'artifact', id: 'art-void-pouch', name: '공허 주머니',
    value: 0, power: 4, rarity: 'common',
    effectDescription: '이 카드를 뽑으면 체력을 1 잃습니다.',
    effectId: 'void-pouch',
  },
  {
    cardType: 'artifact', id: 'art-life-stone', name: '충전형 생명석',
    value: 6, power: 1, rarity: 'rare',
    effectDescription: '손패에서 2 한 장을 소멸시키고 다른 아군의 체력을 5 회복시킵니다.',
    effectId: 'life-stone',
  },
  {
    cardType: 'artifact', id: 'art-burning-dagger', name: '불타는 단검',
    value: 3, power: 2, rarity: 'common',
    effectDescription: '이 카드를 다른 아군 마법열에 놓으면 즉시 해당 마법열을 시전하고 상대방이 카드를 1장 뽑습니다.',
    effectId: 'burning-dagger',
  },
  {
    cardType: 'artifact', id: 'art-giant-slayer', name: '거인 살해자',
    value: 6, power: 3, rarity: 'rare',
    effectDescription: '소멸. 다른 아군의 마법열을 선택합니다. 결과값의 2,3,4배에 해당하는 값 중 하나를 발동합니다.',
    effectId: 'giant-slayer',
  },
  {
    cardType: 'artifact', id: 'art-wolf-trap', name: '늑대 덫',
    value: 3, power: 2, rarity: 'common',
    effectDescription: '15(****)를 발동합니다.',
    effectId: 'wolf-trap',
  },
  {
    cardType: 'artifact', id: 'art-rift-generator', name: '균열 생성기',
    value: 5, power: 2, rarity: 'rare',
    effectDescription: '6장 이상의 카드가 놓인 마법열이 있으면, 보호막을 두 개 파괴합니다.',
    effectId: 'rift-generator',
  },
  {
    cardType: 'artifact', id: 'art-sealed-chromatica', name: '봉인된 크로마티카',
    value: 2, power: 0, rarity: 'common',
    effectDescription: '[-77 발동]: 이 카드를 영구 소멸시키고 전설 스태프 크로마티카를 획득합니다.',
    effectId: 'sealed-chromatica',
  },
  // Tutorial-specific artifacts
  {
    cardType: 'artifact', id: 'art-fierce-flame', name: '맹렬한 불길',
    value: 3, power: 1, rarity: 'common',
    effectDescription: '내려놓은 불(3) 한 장에 *를 추가합니다.',
    effectId: 'fierce-flame',
  },
  {
    cardType: 'artifact', id: 'art-heat-absorb', name: '열기 흡수',
    value: 3, power: 1, rarity: 'common',
    effectDescription: '이번 차례에 주문 시전에 사용한 불(3) 한 장당 1 마나를 획득합니다.',
    effectId: 'heat-absorb',
  },
];

export const equipmentDefs: EquipmentDef[] = [
  {
    id: 'equip-feather-robe', name: '깃털 로브', slot: 'robe', rarity: 'common',
    effectDescription: '최대 체력 +2. [1 마나]: 마법열의 카드 한 장을 손으로 들고 옵니다.',
    effectId: 'feather-robe',
  },
  {
    id: 'equip-predator-hat', name: '포식자의 모자', slot: 'hat', rarity: 'rare',
    effectDescription: '적을 처치할 때마다 각인 1',
    effectId: 'predator-hat',
  },
  {
    id: 'equip-echo-thunder', name: '마도서: 메아리치는 천둥', slot: 'leftHand', rarity: 'common',
    effectDescription: '[14 발동]: 21~25 중 원하는 자연수(**)를 두 번 발동합니다.',
    effectId: 'echo-thunder',
  },
  {
    id: 'equip-fork-lightning', name: '스태프: 갈래 번개', slot: 'rightHand', rarity: 'rare',
    effectDescription: '[5 마나]: 7이 포함된 마법열 하나를 시전합니다. 이 스태프가 결과값 +1과 결과값 +2도 발동시킵니다.',
    effectId: 'fork-lightning',
  },
  {
    id: 'equip-lightning-potion', name: '번개 포션', slot: 'accessory', rarity: 'common',
    effectDescription: '소멸. 7을 영창합니다. 7을 발동합니다.',
    effectId: 'lightning-potion',
  },
  {
    id: 'equip-life-potion', name: '생명 포션', slot: 'accessory', rarity: 'common',
    effectDescription: '소멸. 2를 영창합니다. 체력을 3 회복합니다.',
    effectId: 'life-potion',
  },
  {
    id: 'equip-fire-potion', name: '화염 포션', slot: 'accessory', rarity: 'common',
    effectDescription: '소멸. 3을 영창합니다. 3을 영창합니다.',
    effectId: 'fire-potion',
  },
  {
    id: 'equip-wind-potion', name: '바람 포션', slot: 'accessory', rarity: 'common',
    effectDescription: '소멸. 4를 영창합니다. 카드를 1장 뽑습니다.',
    effectId: 'wind-potion',
  },
  {
    id: 'equip-frost-potion', name: '서리 포션', slot: 'accessory', rarity: 'common',
    effectDescription: '소멸. 5를 영창합니다. 마나를 2 얻습니다.',
    effectId: 'frost-potion',
  },
  {
    id: 'equip-earth-potion', name: '대지 포션', slot: 'accessory', rarity: 'common',
    effectDescription: '소멸. 6을 영창합니다. 각인 1',
    effectId: 'earth-potion',
  },
  {
    id: 'equip-rune-potion', name: '룬 포션', slot: 'accessory', rarity: 'common',
    effectDescription: '소멸. 더하기와 곱하기를 영창합니다.',
    effectId: 'rune-potion',
  },
  {
    id: 'equip-ether-potion', name: '에테르 포션', slot: 'accessory', rarity: 'epic',
    effectDescription: '소멸. 1~9 중 원하는 자연수를 영창합니다.',
    effectId: 'ether-potion',
  },
  {
    id: 'equip-hephaestus', name: '헤파이스토스의 영약', slot: 'accessory', rarity: 'legendary',
    effectDescription: '영구 소멸. 이번 시나리오에서 내 모든 마도구가 다용도를 얻습니다.',
    effectId: 'hephaestus',
  },
  {
    id: 'equip-hell-hat', name: '갉아먹는 지옥 모자', slot: 'hat', rarity: 'epic',
    effectDescription: '내 턴이 시작할 때, 체력을 2 잃고 카드를 1장 뽑습니다.',
    effectId: 'hell-hat',
  },
  {
    id: 'equip-berserker-robe', name: '광전사의 전투복', slot: 'robe', rarity: 'rare',
    effectDescription: '장신구 슬롯 +1. 체력을 잃을 때마다 적에게 취약 1을 부여합니다.',
    effectId: 'berserker-robe',
  },
  {
    id: 'equip-lifesteal-staff', name: '스태프: 생명력 흡수', slot: 'leftHand', rarity: 'common',
    effectDescription: '[2 마나] 취약 2 이상인 적이 있으면, 해당 적의 취약을 1 제거하고 체력을 4 회복합니다.',
    effectId: 'lifesteal-staff',
  },
  {
    id: 'equip-fusion-robe', name: '융합의 로브', slot: 'robe', rarity: 'epic',
    effectDescription: '최대 체력 +4. [4 마나]: 아군과 자신의 마법열을 하나씩 선택합니다. 결과값의 합을 발동합니다.',
    effectId: 'fusion-robe',
  },
  {
    id: 'equip-chromatica', name: '크로마티카', slot: 'rightHand', rarity: 'legendary',
    effectDescription: '발동하는 모든 마법의 파워 +2. [3 마나] 서로 다른 4개의 수로 이루어진 마법열 하나를 오메가 시전합니다.',
    effectId: 'chromatica',
  },
  // Tutorial equipment
  {
    id: 'equip-amber-staff', name: '호박석 지팡이', slot: 'rightHand', rarity: 'rare',
    effectDescription: '3 마나 -> 불(3)이 포함된 수식을 하나 선택합니다. 그 수식을 두 번 시전합니다.',
    effectId: 'amber-staff',
  },
  {
    id: 'equip-old-shield', name: '낡은 방패', slot: 'leftHand', rarity: 'common',
    effectDescription: '시나리오 중 한 번, 공격받았을 시 받는 피해를 1 감소시킵니다.',
    effectId: 'old-shield',
  },
  {
    id: 'equip-small-fire-potion', name: '소형 화염 포션', slot: 'accessory', rarity: 'common',
    effectDescription: '시나리오 중 한 번, 이번 턴에만 사용할 수 있는 불(3) 한 장을 손으로 들고 옵니다.',
    effectId: 'small-fire-potion',
  },
];

export function getAllCards(): (ElementCard | RuneCard | ArtifactCard)[] {
  return [...elementCards, ...runeCards, ...artifactCards];
}

export function getCardById(id: string): ElementCard | RuneCard | ArtifactCard | undefined {
  return getAllCards().find(c => c.id === id);
}

export function getEquipmentById(id: string): EquipmentDef | undefined {
  return equipmentDefs.find(e => e.id === id);
}

export function getCardDisplayValue(card: ElementCard | RuneCard | ArtifactCard): string {
  if (card.cardType === 'rune') return card.symbol;
  if (card.cardType === 'element') return `${card.value}${'*'.repeat(card.power)}`;
  const art = card as ArtifactCard;
  const val = art.value !== undefined ? String(art.value) : (art.symbol ?? '');
  return `${val}${'*'.repeat(art.power)}`;
}

export function getCardPower(card: ElementCard | RuneCard | ArtifactCard): number {
  if (card.cardType === 'rune') return 0;
  return card.power;
}

export function getCardValue(card: ElementCard | RuneCard | ArtifactCard): number | undefined {
  if (card.cardType === 'rune') return undefined;
  if (card.cardType === 'element') return card.value;
  return (card as ArtifactCard).value;
}

export function getCardSymbol(card: ElementCard | RuneCard | ArtifactCard): RuneSymbol | undefined {
  if (card.cardType === 'rune') return card.symbol;
  return (card as ArtifactCard).symbol;
}
