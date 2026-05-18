import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useCampaignStore } from '../../store/campaignStore';
import { getCardById } from '../../data/cards';
import { getMonsterById } from '../../data/monsters';
import { evaluateMagicLine } from '../../engine/formula';
import { CardDisplay, CardTooltip } from '../common/CardDisplay';
import type { MonsterInstance, EquipmentDef, Card } from '../../types';

export default function BattleSimulator() {
  const game = useGameStore();
  const campaign = useCampaignStore();
  const [selectedHandCard, setSelectedHandCard] = useState<string | null>(null);
  const [targetMode, setTargetMode] = useState<'none' | 'castTarget'>('none');
  const [pendingCast, setPendingCast] = useState<{ value: number; power: number; lineIndex: number; isEquals: boolean } | null>(null);
  const [orderDraft, setOrderDraft] = useState<number[]>([]);
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [game.log]);

  function handleInit() {
    game.initGame(campaign.config);
  }

  function handleStartRound() {
    game.startRound();
  }

  function handlePlaceCard(lineIndex: number) {
    if (!selectedHandCard) return;
    game.placeCardOnMagicLine(selectedHandCard, lineIndex);
    setSelectedHandCard(null);
  }

  function handleCastLine(lineIndex: number) {
    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer) return;

    const line = currentPlayer.magicLines[lineIndex];
    if (line.cards.length === 0) return;

    const cards = line.cards.map(ci => getCardById(ci.cardId)!).filter(Boolean);
    const result = evaluateMagicLine(cards);
    if (!result) return;

    const totalPower = result.power + line.imprintPower;
    setPendingCast({ value: result.value, power: totalPower, lineIndex, isEquals: false });
    setTargetMode('castTarget');
  }

  function handleEqualsCast(lineIndex: number) {
    if (!selectedHandCard) return;
    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer) return;

    const line = currentPlayer.magicLines[lineIndex];
    if (line.cards.length === 0) return;

    const cards = line.cards.map(ci => getCardById(ci.cardId)!).filter(Boolean);
    const result = evaluateMagicLine(cards);
    if (!result) return;

    const totalPower = result.power + line.imprintPower;

    // Place the flipped card immediately so user sees it on the line
    game.placeEqualsCard(selectedHandCard, lineIndex);

    setPendingCast({ value: result.value, power: totalPower, lineIndex, isEquals: true });
    setTargetMode('castTarget');
  }

  function handleTargetMonster(monsterInstanceId: string) {
    if (targetMode === 'castTarget' && pendingCast) {
      const wasEquals = pendingCast.isEquals;

      if (wasEquals) {
        game.addLog(`등호 시전 발동!`, 'action');
      }

      game.castMagicLine(pendingCast.lineIndex);
      game.activateMagic(pendingCast.value, pendingCast.power, 'monster', monsterInstanceId);

      setSelectedHandCard(null);
      setPendingCast(null);
      setTargetMode('none');

      if (wasEquals) {
        setTimeout(() => game.endPlayerTurn(), 200);
      }
    }
  }

  function handleUseArtifact() {
    if (!selectedHandCard) return;
    const currentPlayer = game.getCurrentPlayer();
    if (!currentPlayer) return;
    const ci = currentPlayer.hand.find(c => c.instanceId === selectedHandCard);
    if (!ci) return;
    const card = getCardById(ci.cardId);
    if (!card || card.cardType !== 'artifact') return;
    game.useArtifact(selectedHandCard);
    setSelectedHandCard(null);
  }

  function cancelTarget() {
    if (pendingCast?.isEquals) {
      game.removeEqualsCard(pendingCast.lineIndex);
    }
    setTargetMode('none');
    setPendingCast(null);
  }

  function handleCardHover(card: Card, e: React.MouseEvent) {
    setHoveredCard(card);
    setTooltipPos({ x: e.clientX + 12, y: e.clientY + 12 });
  }

  function handleForfeit() {
    setShowForfeitConfirm(false);
    game.forfeitGame();
  }

  const currentPlayer = game.getCurrentPlayer();

  return (
    <div className="h-[calc(100vh-52px)] flex">
      {/* Main battle area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {game.phase === 'setup' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-text-primary mb-4">전투 준비</h2>
              <p className="text-text-secondary mb-6">캠페인 에디터에서 설정한 구성으로 전투를 시작합니다.</p>
              <button
                onClick={handleInit}
                className="px-6 py-3 bg-accent-purple text-white rounded-lg font-medium hover:bg-accent-purple/80 transition-colors text-lg"
              >
                전투 초기화
              </button>
            </div>
          </div>
        )}

        {game.phase !== 'setup' && (
          <>
            {/* Monster area */}
            <div className="bg-bg-secondary border-b border-border p-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-accent-red flex items-center gap-2">
                  몬스터 영역 — 라운드 {game.round}
                  {game.tutorialMode && (
                    <span className="px-1.5 py-0.5 text-[9px] bg-accent-gold/20 text-accent-gold rounded">
                      TUTORIAL
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {(game.phase === 'roundEnd' || game.phase === 'monsterAttack') && (
                    <button
                      onClick={handleStartRound}
                      className="px-3 py-1 text-sm bg-accent-gold text-bg-primary rounded font-medium hover:bg-accent-gold/80"
                    >
                      다음 라운드
                    </button>
                  )}
                  {game.round === 0 && game.players.length > 0 && (
                    <button onClick={handleStartRound} className="px-3 py-1 text-sm bg-accent-green text-bg-primary rounded font-medium">
                      라운드 시작
                    </button>
                  )}
                  {(game.phase === 'playerTurn' || game.phase === 'roundEnd' || game.phase === 'orderSelection' || game.phase === 'monsterAttack') && (
                    <button
                      onClick={() => setShowForfeitConfirm(true)}
                      className="px-3 py-1 text-sm bg-accent-red/20 text-accent-red border border-accent-red/40 rounded hover:bg-accent-red/30"
                    >
                      포기
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto">
                {game.monsterSlots.map((slot, si) => (
                  <MonsterCard
                    key={si}
                    slot={slot}
                    slotIndex={si}
                    isTargetMode={targetMode === 'castTarget'}
                    onTarget={handleTargetMonster}
                  />
                ))}
              </div>
            </div>

            {/* Order selection overlay */}
            {game.phase === 'orderSelection' && (
              <div className="flex-1 flex items-center justify-center bg-bg-primary/80">
                <div className="bg-bg-secondary border border-border rounded-xl p-6 max-w-md">
                  <h3 className="text-lg font-bold text-text-primary mb-4">행동 순서 결정</h3>
                  <div className="space-y-2 mb-4">
                    {game.players.map((p, i) => {
                      const orderPos = orderDraft.indexOf(i);
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (orderPos >= 0) {
                              setOrderDraft(orderDraft.filter(x => x !== i));
                            } else {
                              setOrderDraft([...orderDraft, i]);
                            }
                          }}
                          className={`w-full px-4 py-2 rounded text-sm text-left transition-colors ${
                            orderPos >= 0
                              ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40'
                              : 'bg-bg-card text-text-secondary hover:bg-bg-hover'
                          }`}
                        >
                          {orderPos >= 0 && <span className="font-bold mr-2">{orderPos + 1}.</span>}
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      if (orderDraft.length === game.players.length) {
                        game.setPlayerOrder(orderDraft);
                        setOrderDraft([]);
                      }
                    }}
                    disabled={orderDraft.length !== game.players.length}
                    className="w-full px-4 py-2 bg-accent-purple text-white rounded font-medium disabled:opacity-40"
                  >
                    확정
                  </button>
                </div>
              </div>
            )}

            {/* Magic lines & hand - player turn */}
            {(game.phase === 'playerTurn' || game.phase === 'roundEnd' || game.phase === 'monsterAttack') && currentPlayer && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {targetMode === 'castTarget' && (
                  <div className="bg-accent-gold/10 border-b border-accent-gold/30 px-4 py-2 flex items-center justify-between flex-shrink-0">
                    <span className="text-sm text-accent-gold font-medium">
                      {pendingCast?.isEquals ? '등호 시전 - ' : ''}대상을 선택하세요: {pendingCast?.value}({'★'.repeat(pendingCast?.power ?? 0)})
                    </span>
                    <button onClick={cancelTarget} className="text-sm text-accent-red hover:underline">
                      취소
                    </button>
                  </div>
                )}

                {/* Player info bar */}
                <div className="bg-bg-tertiary border-b border-border px-4 py-2 flex items-center gap-6 flex-shrink-0">
                  <span className="font-medium text-text-primary">{currentPlayer.name}</span>
                  <span className="text-sm">
                    <span className="text-accent-red">HP: {currentPlayer.hp}/{currentPlayer.maxHp}</span>
                  </span>
                  <span className="text-sm">
                    <span className="text-accent-blue">Mana: {currentPlayer.mana}</span>
                  </span>
                  <span className="text-sm text-text-muted">
                    덱: {currentPlayer.deck.length} | 버림: {currentPlayer.discardPile.length}
                  </span>
                  <div className="flex-1" />
                  {game.phase === 'playerTurn' && (
                    <button
                      onClick={() => game.endPlayerTurn()}
                      className="px-4 py-1.5 text-sm bg-accent-red/20 text-accent-red border border-accent-red/40 rounded hover:bg-accent-red/30 transition-colors"
                    >
                      턴 종료
                    </button>
                  )}
                </div>

                {/* Magic Lines */}
                <div className="p-4 space-y-3 flex-shrink-0">
                  {currentPlayer.magicLines.map((line, li) => {
                    const cards = line.cards.map(ci => getCardById(ci.cardId)!).filter(Boolean);
                    const result = cards.length > 0 ? evaluateMagicLine(cards) : null;
                    const totalPower = result ? result.power + line.imprintPower : 0;
                    const equalsCardData = line.equalsCard ? getCardById(line.equalsCard.cardId) : null;

                    return (
                      <div key={li} className="flex items-center gap-2">
                        <span className="text-xs text-text-muted w-16 text-right flex-shrink-0">
                          마법열 {li + 1}
                        </span>
                        <div
                          className={`flex-1 min-h-[72px] flex items-center gap-1 px-3 py-2 rounded-lg border-2 border-dashed transition-colors ${
                            selectedHandCard
                              ? 'border-accent-purple/60 bg-accent-purple/5 cursor-pointer'
                              : 'border-border bg-bg-card/50'
                          }`}
                          onClick={() => selectedHandCard && handlePlaceCard(li)}
                          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-accent-purple'); }}
                          onDragLeave={e => { e.currentTarget.classList.remove('border-accent-purple'); }}
                          onDrop={e => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('border-accent-purple');
                            const cardId = e.dataTransfer.getData('cardInstanceId');
                            if (cardId) {
                              game.placeCardOnMagicLine(cardId, li);
                              setSelectedHandCard(null);
                            }
                          }}
                        >
                          {cards.map((card, ci) => (
                            <div
                              key={ci}
                              onMouseEnter={e => handleCardHover(card, e)}
                              onMouseLeave={() => setHoveredCard(null)}
                              onMouseMove={e => handleCardHover(card, e)}
                            >
                              <CardDisplay
                                card={card}
                                size="sm"
                                onClick={() => {
                                  if (game.phase === 'playerTurn') {
                                    game.removeCardFromMagicLine(li, ci);
                                  }
                                }}
                              />
                            </div>
                          ))}
                          {/* Flipped equals card */}
                          {equalsCardData && (
                            <div
                              className="w-14 h-20 bg-gradient-to-br from-accent-gold/30 to-accent-purple/30 border-2 border-accent-gold rounded-lg flex flex-col items-center justify-center text-accent-gold shadow-lg shadow-accent-gold/20"
                              title={`등호 (뒤집힌 카드: ${equalsCardData.name})`}
                            >
                              <span className="text-3xl font-bold leading-none">=</span>
                              <span className="text-[8px] mt-1 opacity-70">FLIPPED</span>
                            </div>
                          )}
                          {cards.length === 0 && !equalsCardData && (
                            <span className="text-text-muted text-xs">카드를 여기에 놓으세요</span>
                          )}
                        </div>
                        {result && (
                          <span className="text-sm font-mono text-accent-gold w-24 text-right flex-shrink-0">
                            = {result.value} {'★'.repeat(totalPower)}
                          </span>
                        )}
                        {cards.length > 0 && game.phase === 'playerTurn' && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleCastLine(li)}
                              className="px-2 py-1 text-xs bg-accent-purple/20 text-accent-purple rounded hover:bg-accent-purple/30"
                              title="시전"
                            >
                              시전
                            </button>
                            {selectedHandCard && !line.equalsCard && (
                              <button
                                onClick={() => handleEqualsCast(li)}
                                className="px-2 py-1 text-xs bg-accent-gold/20 text-accent-gold rounded hover:bg-accent-gold/30"
                                title="등호 시전 (턴 종료)"
                              >
                                = 등호
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Hand */}
                <div className="flex-1 bg-bg-secondary border-t border-border p-4 overflow-hidden">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-text-muted">손패 ({currentPlayer.hand.length}장)</span>
                    {selectedHandCard && (
                      <>
                        <button
                          onClick={handleUseArtifact}
                          className="text-xs px-2 py-0.5 bg-accent-green/20 text-accent-green rounded hover:bg-accent-green/30"
                        >
                          마도구 사용
                        </button>
                        <button
                          onClick={() => setSelectedHandCard(null)}
                          className="text-xs text-text-muted hover:text-text-primary"
                        >
                          선택 해제
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {currentPlayer.hand.map(ci => {
                      const card = getCardById(ci.cardId);
                      if (!card) return null;
                      return (
                        <div
                          key={ci.instanceId}
                          onMouseEnter={e => handleCardHover(card, e)}
                          onMouseLeave={() => setHoveredCard(null)}
                          onMouseMove={e => handleCardHover(card, e)}
                        >
                          <CardDisplay
                            card={card}
                            size="md"
                            selected={selectedHandCard === ci.instanceId}
                            onClick={() => setSelectedHandCard(
                              selectedHandCard === ci.instanceId ? null : ci.instanceId
                            )}
                            draggable
                            onDragStart={e => {
                              e.dataTransfer.setData('cardInstanceId', ci.instanceId);
                              setSelectedHandCard(ci.instanceId);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {(game.phase === 'victory' || game.phase === 'defeat') && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <h2 className={`text-4xl font-bold mb-4 ${
                    game.phase === 'victory' ? 'text-accent-gold' : 'text-accent-red'
                  }`}>
                    {game.phase === 'victory' ? 'VICTORY!' : 'DEFEAT...'}
                  </h2>
                  <p className="text-text-secondary mb-6">
                    {game.phase === 'victory'
                      ? '모든 몬스터를 처치했습니다!'
                      : '전투가 종료되었습니다.'}
                  </p>
                  <button
                    onClick={() => game.restartGame()}
                    className="px-6 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80"
                  >
                    다시 시작
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right sidebar - equipment + log */}
      <div className="w-80 bg-bg-secondary border-l border-border flex flex-col flex-shrink-0">
        {currentPlayer && (
          <EquipmentPanel player={currentPlayer} />
        )}

        {game.players.length > 1 && (
          <div className="p-3 border-b border-border flex-shrink-0">
            <div className="text-xs text-text-muted mb-2">플레이어 상태</div>
            <div className="space-y-1">
              {game.players.map((p, i) => (
                <div key={i} className={`text-xs px-2 py-1 rounded ${
                  game.playerOrder[game.currentPlayerIndex] === i
                    ? 'bg-accent-purple/20 text-accent-purple'
                    : 'text-text-secondary'
                }`}>
                  {p.name}: HP {p.hp}/{p.maxHp} | Mana {p.mana}
                  {p.hasActedThisRound && ' (완료)'}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex-shrink-0">
            <span className="text-xs text-text-muted">게임 로그</span>
          </div>
          <div ref={logRef} className="flex-1 overflow-auto p-3 space-y-0.5">
            {game.log.map((entry, i) => (
              <div key={i} className={`text-[11px] leading-tight ${
                entry.type === 'phase' ? 'text-accent-gold font-medium mt-2' :
                entry.type === 'damage' ? 'text-accent-red' :
                entry.type === 'kill' ? 'text-accent-green font-medium' :
                entry.type === 'defense' ? 'text-accent-blue' :
                entry.type === 'action' ? 'text-accent-purple' :
                entry.type === 'effect' ? 'text-element-lightning' :
                'text-text-muted'
              }`}>
                {entry.message}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredCard && (
        <div className="fixed pointer-events-none z-50" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
          <CardTooltip card={hoveredCard} />
        </div>
      )}

      {/* Forfeit confirmation modal */}
      {showForfeitConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-bg-secondary border border-border rounded-xl p-6 max-w-sm">
            <h3 className="text-lg font-bold text-accent-red mb-2">전투 포기</h3>
            <p className="text-sm text-text-secondary mb-4">
              정말로 이 전투를 포기하시겠습니까? 진행 중인 게임이 종료됩니다.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowForfeitConfirm(false)}
                className="px-4 py-2 text-sm bg-bg-card text-text-secondary rounded hover:bg-bg-hover"
              >
                취소
              </button>
              <button
                onClick={handleForfeit}
                className="px-4 py-2 text-sm bg-accent-red text-white rounded hover:bg-accent-red/80"
              >
                포기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EquipmentPanel({ player }: { player: import('../../types').PlayerState }) {
  const game = useGameStore();
  const allEquips: { equip: EquipmentDef; slotLabel: string }[] = [];
  if (player.equipment.hat) allEquips.push({ equip: player.equipment.hat, slotLabel: '모자' });
  if (player.equipment.robe) allEquips.push({ equip: player.equipment.robe, slotLabel: '로브' });
  if (player.equipment.leftHand) allEquips.push({ equip: player.equipment.leftHand, slotLabel: '왼손' });
  if (player.equipment.rightHand) allEquips.push({ equip: player.equipment.rightHand, slotLabel: '오른손' });
  player.equipment.accessories.forEach(a => allEquips.push({ equip: a, slotLabel: '장신구' }));

  return (
    <div className="p-3 border-b border-border flex-shrink-0 max-h-[40vh] overflow-y-auto">
      <div className="text-xs text-text-muted mb-2">장비</div>
      {game.pendingDamageReduction > 0 && (
        <div className="text-[10px] text-accent-blue mb-2 px-2 py-1 bg-accent-blue/10 rounded">
          🛡️ 피해 감소 충전 ×{game.pendingDamageReduction}
        </div>
      )}
      <div className="space-y-2">
        {allEquips.map(({ equip, slotLabel }, i) => {
          const isUsed = player.equipmentUsedThisScenario.includes(equip.id);
          const canUse = equip.activeUse && !isUsed && (
            equip.activeUse.cost.type !== 'mana' || player.mana >= equip.activeUse.cost.amount
          );
          const isOncePerScenario = equip.activeUse?.cost.type === 'oncePerScenario' ||
                                    equip.activeUse?.cost.type === 'oncePerScenarioPermanent';

          return (
            <div
              key={i}
              className={`text-[11px] bg-bg-card rounded p-2 ${
                isUsed ? 'opacity-50' : ''
              }`}
              title={equip.effectDescription}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-text-primary font-medium">
                  <span className="text-text-muted text-[9px] mr-1">[{slotLabel}]</span>
                  {equip.name}
                </span>
              </div>
              <div className="text-[10px] text-text-muted mb-1 line-clamp-2">
                {equip.effectDescription}
              </div>
              {equip.activeUse && (
                <button
                  onClick={() => game.useEquipment(equip.id)}
                  disabled={!canUse || game.phase !== 'playerTurn'}
                  className={`w-full mt-1 px-2 py-1 text-[10px] rounded transition-colors ${
                    canUse && game.phase === 'playerTurn'
                      ? 'bg-accent-purple/20 text-accent-purple hover:bg-accent-purple/30'
                      : 'bg-bg-hover text-text-muted cursor-not-allowed'
                  }`}
                >
                  {isUsed ? '✓ 사용 완료' : (
                    <>
                      {equip.activeUse.label}
                      {equip.activeUse.cost.type === 'mana' && ` [${equip.activeUse.cost.amount}M]`}
                      {isOncePerScenario && ' [1회]'}
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
        {allEquips.length === 0 && (
          <div className="text-[10px] text-text-muted">장착된 장비가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

function MonsterCard({
  slot, slotIndex, isTargetMode, onTarget,
}: {
  slot: { queue: string[]; activeMonster: MonsterInstance | null };
  slotIndex: number;
  isTargetMode: boolean;
  onTarget: (id: string) => void;
}) {
  const monster = slot.activeMonster;
  if (!monster) {
    if (slot.queue.length === 0) {
      return (
        <div className="w-44 h-36 border border-dashed border-border rounded-lg flex items-center justify-center text-xs text-text-muted">
          슬롯 {slotIndex + 1} — 비어 있음
        </div>
      );
    }
    return (
      <div className="w-44 h-36 border border-border/50 rounded-lg flex items-center justify-center text-xs text-text-muted bg-bg-card/30">
        대기 중: {slot.queue.length}마리
      </div>
    );
  }

  const def = getMonsterById(monster.defId);
  if (!def) return null;

  const isDead = monster.isDead;
  const soulValues = Array.isArray(def.soulValue) ? def.soulValue : [def.soulValue];
  const totalSouls = soulValues.length;
  const destroyedCount = monster.destroyedSouls.length;

  return (
    <div
      className={`w-44 rounded-lg border-2 p-3 transition-all flex-shrink-0 ${
        isDead
          ? 'border-border/30 bg-bg-card/20 opacity-40'
          : isTargetMode
          ? 'border-accent-red cursor-pointer hover:bg-accent-red/10 animate-pulse'
          : 'border-border bg-bg-card'
      }`}
      onClick={() => isTargetMode && !isDead && onTarget(monster.instanceId)}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`font-medium text-sm ${isDead ? 'line-through text-text-muted' : 'text-text-primary'}`}>
          {def.name}
        </span>
        <span className={`text-[10px] px-1 py-0.5 rounded ${
          def.tier === 'boss' ? 'bg-accent-red/20 text-accent-red' : 'bg-bg-hover text-text-muted'
        }`}>
          {def.tier === 'boss' ? 'BOSS' : def.tier}
        </span>
      </div>

      <div className="text-[10px] text-text-muted mb-1">
        소울: {soulValues.map((sv, i) => (
          <span key={i} className={monster.destroyedSouls.includes(sv) ? 'line-through text-accent-red' : ''}>
            {sv}{i < soulValues.length - 1 ? ', ' : ''}
          </span>
        ))} {'★'.repeat(def.soulPower)}
        {totalSouls > 1 && ` (${destroyedCount}/${totalSouls})`}
      </div>

      {monster.shieldCount > 0 && (
        <div className="text-[10px] text-accent-blue mb-1">
          보호막 ×{monster.shieldCount}
        </div>
      )}
      {monster.strengthenStacks > 0 && (
        <div className="text-[10px] text-accent-red mb-1">
          강화 +{monster.strengthenStacks}
        </div>
      )}

      {monster.currentPattern && !isDead && (
        <div className="mt-2 bg-accent-red/10 rounded px-2 py-1.5 border border-accent-red/20">
          <div className="text-xs font-medium text-accent-red">{monster.currentPattern.name}</div>
          <div className="text-[10px] text-text-secondary mt-0.5">
            {monster.currentPattern.targetValue !== undefined && (
              <span>방어: {monster.currentPattern.targetValue}{'★'.repeat(monster.currentPattern.targetPower ?? 0)} | </span>
            )}
            {monster.currentPattern.damage !== undefined && monster.currentPattern.damage > 0 && (
              <span>{monster.currentPattern.damage + monster.strengthenStacks} 피해</span>
            )}
            {(!monster.currentPattern.damage || monster.currentPattern.damage === 0) && (
              <span>{monster.currentPattern.effectDescription}</span>
            )}
          </div>
        </div>
      )}

      {slot.queue.length > 0 && (
        <div className="text-[10px] text-text-muted mt-1">
          대기: {slot.queue.length}마리
        </div>
      )}
    </div>
  );
}
