import type { Card, SubFormula, RuneSymbol } from '../types';
import { getCardValue, getCardSymbol, getCardPower } from '../data/cards';

interface FormulaToken {
  type: 'number' | 'operator';
  value?: number;
  operator?: RuneSymbol;
  power: number;
  cardIndex: number;
}

export function tokenizeMagicLine(cards: Card[]): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const numVal = getCardValue(card);
    const sym = getCardSymbol(card);
    if (numVal !== undefined) {
      tokens.push({ type: 'number', value: numVal, power: getCardPower(card), cardIndex: i });
    } else if (sym) {
      tokens.push({ type: 'operator', operator: sym, power: 0, cardIndex: i });
    }
  }
  return tokens;
}

function evaluateTokenSequence(tokens: FormulaToken[]): number | null {
  if (tokens.length === 0) return null;
  if (tokens[0].type !== 'number') return null;
  if (tokens.length === 1) return tokens[0].value!;

  const numbers: number[] = [];
  const operators: RuneSymbol[] = [];
  for (const t of tokens) {
    if (t.type === 'number') numbers.push(t.value!);
    else operators.push(t.operator!);
  }

  if (numbers.length !== operators.length + 1) return null;

  // Standard math order: * first, then + and -
  const nums = [...numbers];
  const ops = [...operators];

  // First pass: handle * and /
  let i = 0;
  while (i < ops.length) {
    if (ops[i] === '*') {
      nums[i] = nums[i] * nums[i + 1];
      nums.splice(i + 1, 1);
      ops.splice(i, 1);
    } else if (ops[i] === '/') {
      if (nums[i + 1] === 0) return null;
      nums[i] = nums[i] / nums[i + 1];
      nums.splice(i + 1, 1);
      ops.splice(i, 1);
    } else {
      i++;
    }
  }

  // Second pass: handle + and -
  let result = nums[0];
  for (let j = 0; j < ops.length; j++) {
    if (ops[j] === '+') result += nums[j + 1];
    else if (ops[j] === '-') result -= nums[j + 1];
  }

  return result;
}

export function evaluateMagicLine(cards: Card[]): { value: number; power: number } | null {
  const tokens = tokenizeMagicLine(cards);
  if (tokens.length === 0) return null;

  const value = evaluateTokenSequence(tokens);
  if (value === null) return null;

  const power = tokens.reduce((sum, t) => sum + t.power, 0);
  return { value, power };
}

export function extractSubFormulas(cards: Card[], imprintPower: number = 0): SubFormula[] {
  const tokens = tokenizeMagicLine(cards);
  if (tokens.length === 0) return [];

  const subFormulas: SubFormula[] = [];

  // Find all contiguous subsequences that form valid expressions.
  // A valid expression starts with a number and alternates number-operator-number.
  // We iterate over all pairs of number-token indices.
  const numberIndices: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'number') numberIndices.push(i);
  }

  for (let si = 0; si < numberIndices.length; si++) {
    for (let ei = si; ei < numberIndices.length; ei++) {
      const startIdx = numberIndices[si];
      const endIdx = numberIndices[ei];

      const subTokens = tokens.slice(startIdx, endIdx + 1);

      // Validate: must be number (op number)*
      let valid = true;
      for (let k = 0; k < subTokens.length; k++) {
        if (k % 2 === 0 && subTokens[k].type !== 'number') { valid = false; break; }
        if (k % 2 === 1 && subTokens[k].type !== 'operator') { valid = false; break; }
      }
      if (!valid || subTokens.length % 2 === 0) continue;

      const value = evaluateTokenSequence(subTokens);
      if (value === null) continue;

      const power = subTokens.reduce((sum, t) => sum + t.power, 0);

      subFormulas.push({
        value,
        power: power + (si === 0 && ei === numberIndices.length - 1 ? imprintPower : 0),
        startIndex: startIdx,
        endIndex: endIdx,
      });
    }
  }

  return subFormulas;
}

export function evaluateFormulaString(expr: string): number | null {
  try {
    const tokens: FormulaToken[] = [];
    let i = 0;
    let idx = 0;
    while (i < expr.length) {
      if (expr[i] === ' ') { i++; continue; }
      if ('+-*/'.includes(expr[i])) {
        tokens.push({ type: 'operator', operator: expr[i] as RuneSymbol, power: 0, cardIndex: idx++ });
        i++;
      } else if (/\d/.test(expr[i]) || (expr[i] === '-' && (tokens.length === 0 || tokens[tokens.length - 1].type === 'operator'))) {
        let num = '';
        if (expr[i] === '-') { num += '-'; i++; }
        while (i < expr.length && /\d/.test(expr[i])) { num += expr[i]; i++; }
        tokens.push({ type: 'number', value: parseInt(num), power: 0, cardIndex: idx++ });
      } else {
        i++;
      }
    }
    return evaluateTokenSequence(tokens);
  } catch {
    return null;
  }
}

export function canDestroySoul(
  magicValue: number,
  magicPower: number,
  soulValue: number | number[],
  soulPower: number,
  vulnerableX: number = 0,
  weakenedX: number = 0,
): boolean | number {
  const requiredPower = Math.max(0, soulPower - weakenedX);
  if (magicPower < requiredPower) return false;

  if (Array.isArray(soulValue)) {
    const matchingSoul = soulValue.find(sv => Math.abs(magicValue - sv) <= vulnerableX);
    if (matchingSoul !== undefined) return matchingSoul;
    return false;
  }

  if (Math.abs(magicValue - soulValue) <= vulnerableX) return true;
  return false;
}

export function canDefendAttack(
  magicValue: number,
  magicPower: number,
  targetValue: number,
  targetPower: number,
  vulnerableX: number = 0,
  weakenedX: number = 0,
): boolean {
  const requiredPower = Math.max(0, targetPower - weakenedX);
  if (magicPower < requiredPower) return false;
  return Math.abs(magicValue - targetValue) <= vulnerableX;
}
