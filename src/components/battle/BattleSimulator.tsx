import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useCampaignStore } from '../../store/campaignStore';
import { getCardById } from '../../data/cards';
import { getMonsterById } from '../../data/monsters';
import { CardDisplay, CardTooltip } from '../common/CardDisplay';
import { STATUS_KEYS, STATUS_LABELS } from '../../types';
import type {
  MonsterInstance, EquipmentDef, Card, PlayerState, StatusKey, StatusCounters,
} from '../../types';

export default function BattleSimulator() {
  const game = useGameStore();
  const campaign = useCampaignStore();
  const [selectedHandCard, setSelectedHandCard] = useState<string | null>(null);
  const [placeAsEquals, setPlaceAsEquals] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [showDiscardPile, setShowDiscardPile] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [game.log]);

  function handleInit() {
    game.initGame(campaign.config);
  }

  const apIdx = game.activePlayerIndex;
  const activePlayer = game.players[apIdx] ?? null;

  function handleCardHover(card: Card, e: React.MouseEvent) {
    setHoveredCard(card);
    setTooltipPos({ x: e.clientX + 12, y: e.clientY + 12 });
  }

  function handlePlaceOnLine(lineIndex: number) {
    if (!selectedHandCard || !activePlayer) return;
    game.placeCardOnLine(apIdx, selectedHandCard, apIdx, lineIndex, placeAsEquals);
    setSelectedHandCard(null);
    setPlaceAsEquals(false);
  }

  function handleForfeit() {
    setShowForfeitConfirm(false);
    game.forfeitGame();
  }

  if (game.phase === 'setup') {
    return (
      <div className="h-[calc(100vh-52px)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-4">전투 준비</h2>
          <p className="text-text-secondary mb-6">
            캠페인 에디터에서 설정한 구성으로 전투를 시작합니다.
          </p>
          <button
            onClick={handleInit}
            className="px-6 py-3 bg-accent-purple text-white rounded-lg font-medium hover:bg-accent-purple/80 transition-colors text-lg"
          >
            전투 초기화
          </button>
        </div>
      </div>
    );
  }

  if (game.phase === 'victory' || game.phase === 'defeat') {
    return (
      <div className="h-[calc(100vh-52px)] flex items-center justify-center">
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
    );
  }

  return (
    <div className="h-[calc(100vh-52px)] flex">
      {/* Main battle area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Monster area */}
        <div className="bg-bg-secondary border-b border-border p-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-accent-red flex items-center gap-2">
              몬스터 영역 — 라운드 {game.round}
              {game.tutorialMode && (
                <span className="px-1.5 py-0.5 text-[9px] bg-accent-gold/20 text-accent-gold rounded">
                  TUTORIAL
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => game.nextRound()}
                className="px-3 py-1 text-sm bg-accent-gold text-bg-primary rounded font-medium hover:bg-accent-gold/80"
                title="모든 플레이어 마나 +1, 모든 몬스터 패턴 갱신"
              >
                다음 라운드 ▶
              </button>
              <button
                onClick={() => game.declareVictory()}
                className="px-3 py-1 text-sm bg-accent-green/20 text-accent-green border border-accent-green/40 rounded hover:bg-accent-green/30"
              >
                승리 선언
              </button>
              <button
                onClick={() => setShowForfeitConfirm(true)}
                className="px-3 py-1 text-sm bg-accent-red/20 text-accent-red border border-accent-red/40 rounded hover:bg-accent-red/30"
              >
                포기
              </button>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {game.monsterSlots.map((slot, si) => (
              <MonsterCard key={si} slot={slot} slotIndex={si} onCardHover={handleCardHover} onCardLeave={() => setHoveredCard(null)} />
            ))}
          </div>
        </div>

        {/* Player tabs */}
        {game.players.length > 1 && (
          <div className="bg-bg-tertiary border-b border-border px-3 py-1 flex items-center gap-1 flex-shrink-0">
            {game.players.map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  game.setActivePlayer(i);
                  setSelectedHandCard(null);
                  setPlaceAsEquals(false);
                }}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  i === apIdx
                    ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                {p.name} (HP {p.hp}/{p.maxHp})
              </button>
            ))}
          </div>
        )}

        {/* Player area */}
        {activePlayer && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <PlayerBar player={activePlayer} playerIndex={apIdx} onShowDiscard={() => setShowDiscardPile(apIdx)} />

            {/* Magic Lines */}
            <div className="p-3 space-y-2 flex-shrink-0 border-b border-border">
              {activePlayer.magicLines.map((line, li) => (
                <MagicLineRow
                  key={li}
                  player={activePlayer}
                  playerIndex={apIdx}
                  lineIndex={li}
                  selectedHandCard={selectedHandCard}
                  placeAsEquals={placeAsEquals}
                  onPlaceCard={() => handlePlaceOnLine(li)}
                  onCardHover={handleCardHover}
                  onCardLeave={() => setHoveredCard(null)}
                />
              ))}
            </div>

            {/* Hand */}
            <div className="flex-1 bg-bg-secondary p-3 overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                <span className="text-xs text-text-muted">손패 ({activePlayer.hand.length}장)</span>
                <button
                  onClick={() => game.drawCard(apIdx)}
                  className="text-xs px-2 py-0.5 bg-accent-blue/20 text-accent-blue rounded hover:bg-accent-blue/30"
                  title="덱에서 1장 뽑기 (덱이 비면 자동으로 버린 패를 섞음)"
                >
                  카드 뽑기 +1
                </button>
                <button
                  onClick={() => game.drawCards(apIdx, game.drawCount)}
                  className="text-xs px-2 py-0.5 bg-accent-blue/10 text-accent-blue rounded hover:bg-accent-blue/30"
                >
                  +{game.drawCount}장
                </button>
                <button
                  onClick={() => game.reshuffleDiscard(apIdx)}
                  disabled={activePlayer.discardPile.length === 0}
                  className="text-xs px-2 py-0.5 bg-bg-card text-text-secondary rounded hover:bg-bg-hover disabled:opacity-40"
                >
                  버린 패 → 덱 ({activePlayer.discardPile.length})
                </button>
                <button
                  onClick={() => setShowDiscardPile(apIdx)}
                  disabled={activePlayer.discardPile.length === 0}
                  className="text-xs px-2 py-0.5 bg-bg-card text-text-secondary rounded hover:bg-bg-hover disabled:opacity-40"
                >
                  버린 패 보기
                </button>
                {selectedHandCard && (
                  <>
                    <div className="w-px h-4 bg-border" />
                    <button
                      onClick={() => {
                        if (selectedHandCard) game.discardFromHand(apIdx, selectedHandCard);
                        setSelectedHandCard(null);
                        setPlaceAsEquals(false);
                      }}
                      className="text-xs px-2 py-0.5 bg-accent-red/20 text-accent-red rounded hover:bg-accent-red/30"
                    >
                      선택 카드 버리기
                    </button>
                    <button
                      onClick={() => setPlaceAsEquals(v => !v)}
                      className={`text-xs px-2 py-0.5 rounded ${
                        placeAsEquals
                          ? 'bg-accent-gold text-bg-primary'
                          : 'bg-accent-gold/20 text-accent-gold hover:bg-accent-gold/30'
                      }`}
                      title="활성화 후 마법열을 클릭하면 카드가 뒤집힌(등호) 형태로 배치됩니다"
                    >
                      = 등호로 두기 {placeAsEquals && '(ON)'}
                    </button>
                    <button
                      onClick={() => { setSelectedHandCard(null); setPlaceAsEquals(false); }}
                      className="text-xs text-text-muted hover:text-text-primary"
                    >
                      선택 해제
                    </button>
                  </>
                )}
              </div>
              <div className="flex-1 flex gap-2 overflow-x-auto pb-1">
                {activePlayer.hand.length === 0 && (
                  <span className="text-xs text-text-muted self-center">손패가 비어 있습니다. 카드 뽑기 버튼을 누르세요.</span>
                )}
                {activePlayer.hand.map(ci => {
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
                          e.dataTransfer.setData('fromPlayerIndex', String(apIdx));
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
      </div>

      {/* Right sidebar */}
      <div className="w-80 bg-bg-secondary border-l border-border flex flex-col flex-shrink-0">
        {activePlayer && <EquipmentPanel player={activePlayer} playerIndex={apIdx} />}

        {game.players.length > 1 && (
          <div className="p-3 border-b border-border flex-shrink-0">
            <div className="text-xs text-text-muted mb-2">플레이어 요약</div>
            <div className="space-y-1">
              {game.players.map((p, i) => (
                <div key={i} className={`text-xs px-2 py-1 rounded ${
                  i === apIdx ? 'bg-accent-purple/20 text-accent-purple' : 'text-text-secondary'
                }`}>
                  {p.name}: HP {p.hp}/{p.maxHp} | Mana {p.mana} | 손패 {p.hand.length}
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

      {/* Forfeit modal */}
      {showForfeitConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-bg-secondary border border-border rounded-xl p-6 max-w-sm">
            <h3 className="text-lg font-bold text-accent-red mb-2">전투 포기</h3>
            <p className="text-sm text-text-secondary mb-4">
              정말로 이 전투를 포기하시겠습니까?
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

      {/* Discard pile viewer */}
      {showDiscardPile !== null && game.players[showDiscardPile] && (
        <DiscardPileModal
          player={game.players[showDiscardPile]}
          playerIndex={showDiscardPile}
          onClose={() => setShowDiscardPile(null)}
          onCardHover={handleCardHover}
          onCardLeave={() => setHoveredCard(null)}
        />
      )}
    </div>
  );
}

// ============================================================
function PlayerBar({
  player, playerIndex, onShowDiscard,
}: {
  player: PlayerState;
  playerIndex: number;
  onShowDiscard: () => void;
}) {
  const game = useGameStore();

  return (
    <div className="bg-bg-tertiary border-b border-border px-3 py-2 flex-shrink-0 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-medium text-text-primary">{player.name}</span>

        <Counter
          label="HP"
          color="text-accent-red"
          value={player.hp}
          max={player.maxHp}
          onMinus={() => game.adjustHp(playerIndex, -1)}
          onPlus={() => game.adjustHp(playerIndex, +1)}
        />
        <Counter
          label="Mana"
          color="text-accent-blue"
          value={player.mana}
          onMinus={() => game.adjustMana(playerIndex, -1)}
          onPlus={() => game.adjustMana(playerIndex, +1)}
        />

        <span className="text-xs text-text-muted">
          덱 {player.deck.length} ·
          <button onClick={onShowDiscard} className="ml-1 underline hover:text-text-primary">
            버림 {player.discardPile.length}
          </button>
        </span>
      </div>

      <StatusChipsRow
        counters={player.statusCounters}
        onAdjust={(key, delta) => game.adjustPlayerStatus(playerIndex, key, delta)}
      />
    </div>
  );
}

// ============================================================
function MagicLineRow({
  player, playerIndex, lineIndex, selectedHandCard, placeAsEquals, onPlaceCard, onCardHover, onCardLeave,
}: {
  player: PlayerState;
  playerIndex: number;
  lineIndex: number;
  selectedHandCard: string | null;
  placeAsEquals: boolean;
  onPlaceCard: () => void;
  onCardHover: (card: Card, e: React.MouseEvent) => void;
  onCardLeave: () => void;
}) {
  const game = useGameStore();
  const line = player.magicLines[lineIndex];
  const refResult = game.getMagicLineResult(playerIndex, lineIndex);
  const equalsCardData = line.equalsCard ? getCardById(line.equalsCard.cardId) : null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted w-14 text-right flex-shrink-0">
        마법열 {lineIndex + 1}
      </span>
      <div
        className={`flex-1 min-h-[72px] flex items-center gap-1 px-3 py-2 rounded-lg border-2 border-dashed transition-colors ${
          selectedHandCard
            ? (placeAsEquals
                ? 'border-accent-gold/60 bg-accent-gold/5 cursor-pointer'
                : 'border-accent-purple/60 bg-accent-purple/5 cursor-pointer')
            : 'border-border bg-bg-card/50'
        }`}
        onClick={() => selectedHandCard && onPlaceCard()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-accent-purple'); }}
        onDragLeave={e => { e.currentTarget.classList.remove('border-accent-purple'); }}
        onDrop={e => {
          e.preventDefault();
          e.currentTarget.classList.remove('border-accent-purple');
          const cardId = e.dataTransfer.getData('cardInstanceId');
          const fromIdx = Number(e.dataTransfer.getData('fromPlayerIndex') || playerIndex);
          if (cardId) game.placeCardOnLine(fromIdx, cardId, playerIndex, lineIndex, placeAsEquals);
        }}
      >
        {line.cards.map((ci, idx) => {
          const card = getCardById(ci.cardId);
          if (!card) return null;
          return (
            <div
              key={ci.instanceId}
              onMouseEnter={e => onCardHover(card, e)}
              onMouseLeave={onCardLeave}
              onMouseMove={e => onCardHover(card, e)}
            >
              <CardDisplay
                card={card}
                size="sm"
                onClick={() => game.removeCardFromLine(playerIndex, lineIndex, idx)}
              />
            </div>
          );
        })}
        {equalsCardData && (
          <div
            onClick={() => game.toggleEqualsCard(playerIndex, lineIndex)}
            className="w-14 h-20 bg-gradient-to-br from-accent-gold/30 to-accent-purple/30 border-2 border-accent-gold rounded-lg flex flex-col items-center justify-center text-accent-gold shadow-lg shadow-accent-gold/20 cursor-pointer hover:scale-105 transition-transform"
            title={`등호 (뒤집힌 카드: ${equalsCardData.name}) - 클릭하면 손으로 회수`}
          >
            <span className="text-3xl font-bold leading-none">=</span>
            <span className="text-[8px] mt-1 opacity-70">FLIPPED</span>
          </div>
        )}
        {line.cards.length === 0 && !equalsCardData && (
          <span className="text-text-muted text-xs">
            {selectedHandCard
              ? (placeAsEquals ? '여기를 클릭하면 등호(뒤집힘)로 배치' : '여기를 클릭하면 카드 배치')
              : '카드를 여기에 놓으세요'}
          </span>
        )}
      </div>
      <div className="w-24 text-right flex-shrink-0">
        {refResult && (
          <span className="text-sm font-mono text-accent-gold" title="참고용 자동 계산값">
            ≈ {refResult.value} {'★'.repeat(refResult.power)}
          </span>
        )}
      </div>
      {(line.cards.length > 0 || equalsCardData) && (
        <button
          onClick={() => game.discardLine(playerIndex, lineIndex)}
          className="px-2 py-1 text-xs bg-accent-red/20 text-accent-red rounded hover:bg-accent-red/30 flex-shrink-0"
          title="이 마법열의 모든 카드를 버린 패로 보냄"
        >
          전체 버리기
        </button>
      )}
    </div>
  );
}

// ============================================================
function Counter({
  label, value, max, color, onMinus, onPlus,
}: {
  label: string;
  value: number;
  max?: number;
  color?: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onMinus}
        className="w-5 h-5 flex items-center justify-center bg-bg-card text-text-secondary rounded hover:bg-bg-hover text-xs"
      >−</button>
      <span className={`text-sm font-mono ${color ?? 'text-text-primary'} min-w-[60px] text-center`}>
        {label}: {value}{max !== undefined ? `/${max}` : ''}
      </span>
      <button
        onClick={onPlus}
        className="w-5 h-5 flex items-center justify-center bg-bg-card text-text-secondary rounded hover:bg-bg-hover text-xs"
      >+</button>
    </div>
  );
}

// ============================================================
function StatusChipsRow({
  counters, onAdjust,
}: {
  counters: StatusCounters;
  onAdjust: (key: StatusKey, delta: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-[10px] text-text-muted mr-1">상태:</span>
      {STATUS_KEYS.map(key => {
        const value = counters[key] ?? 0;
        return (
          <div
            key={key}
            className={`flex items-center gap-0.5 rounded text-[10px] ${
              value > 0
                ? 'bg-accent-purple/15 text-accent-purple'
                : 'bg-bg-card/50 text-text-muted'
            }`}
          >
            <button
              onClick={() => onAdjust(key, -1)}
              className="px-1 hover:bg-black/20 rounded-l"
              disabled={value === 0}
            >−</button>
            <span className="px-1">{STATUS_LABELS[key]} {value}</span>
            <button
              onClick={() => onAdjust(key, +1)}
              className="px-1 hover:bg-black/20 rounded-r"
            >+</button>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
function EquipmentPanel({ player, playerIndex }: { player: PlayerState; playerIndex: number }) {
  const game = useGameStore();
  const allEquips: { equip: EquipmentDef; slotLabel: string }[] = [];
  if (player.equipment.hat) allEquips.push({ equip: player.equipment.hat, slotLabel: '모자' });
  if (player.equipment.robe) allEquips.push({ equip: player.equipment.robe, slotLabel: '로브' });
  if (player.equipment.leftHand) allEquips.push({ equip: player.equipment.leftHand, slotLabel: '왼손' });
  if (player.equipment.rightHand) allEquips.push({ equip: player.equipment.rightHand, slotLabel: '오른손' });
  player.equipment.accessories.forEach(a => allEquips.push({ equip: a, slotLabel: '장신구' }));

  return (
    <div className="p-3 border-b border-border flex-shrink-0 max-h-[40vh] overflow-y-auto">
      <div className="text-xs text-text-muted mb-2">{player.name}의 장비</div>
      <div className="space-y-2">
        {allEquips.map(({ equip, slotLabel }, i) => {
          const isUsed = player.equipmentUsedThisScenario.includes(equip.id);
          const isOncePerScenario = equip.activeUse?.cost.type === 'oncePerScenario' ||
                                    equip.activeUse?.cost.type === 'oncePerScenarioPermanent';
          const canUse = !!equip.activeUse && !isUsed && (
            equip.activeUse.cost.type !== 'mana' || player.mana >= equip.activeUse.cost.amount
          );

          return (
            <div
              key={i}
              className={`text-[11px] bg-bg-card rounded p-2 ${isUsed ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-text-primary font-medium">
                  <span className="text-text-muted text-[9px] mr-1">[{slotLabel}]</span>
                  {equip.name}
                </span>
              </div>
              <div className="text-[10px] text-text-muted mb-1">
                {equip.effectDescription}
              </div>
              {equip.activeUse && (
                <div className="flex gap-1">
                  <button
                    onClick={() => game.useEquipment(playerIndex, equip.id)}
                    disabled={!canUse}
                    className={`flex-1 px-2 py-1 text-[10px] rounded transition-colors ${
                      canUse
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
                  {isUsed && isOncePerScenario && (
                    <button
                      onClick={() => game.resetEquipmentUse(playerIndex, equip.id)}
                      className="px-1 py-1 text-[10px] bg-bg-hover text-text-muted rounded"
                      title="사용 표시를 초기화 (실수로 누른 경우)"
                    >
                      ↺
                    </button>
                  )}
                </div>
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

// ============================================================
function MonsterCard({
  slot, slotIndex, onCardHover, onCardLeave,
}: {
  slot: { queue: string[]; activeMonster: MonsterInstance | null };
  slotIndex: number;
  onCardHover: (card: Card, e: React.MouseEvent) => void;
  onCardLeave: () => void;
}) {
  const game = useGameStore();
  const monster = slot.activeMonster;
  void onCardHover;
  void onCardLeave;

  if (!monster) {
    if (slot.queue.length === 0) {
      return (
        <div className="w-48 min-h-[14rem] border border-dashed border-border rounded-lg flex items-center justify-center text-xs text-text-muted flex-shrink-0">
          슬롯 {slotIndex + 1} — 비어 있음
        </div>
      );
    }
    return (
      <div className="w-48 min-h-[14rem] border border-border/50 rounded-lg flex flex-col items-center justify-center gap-2 text-xs text-text-muted bg-bg-card/30 flex-shrink-0">
        <span>대기 중: {slot.queue.length}마리</span>
        <button
          onClick={() => game.spawnNextMonsterInSlot(slotIndex)}
          className="px-2 py-1 text-xs bg-accent-purple/20 text-accent-purple rounded hover:bg-accent-purple/30"
        >
          다음 몬스터 소환
        </button>
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
    <div className={`w-56 rounded-lg border-2 p-2 flex-shrink-0 transition-all ${
      isDead ? 'border-border/30 bg-bg-card/20 opacity-40' : 'border-border bg-bg-card'
    }`}>
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
        소울 {'★'.repeat(def.soulPower)}: {soulValues.map((sv, i) => {
          const destroyed = monster.destroyedSouls.includes(sv);
          return (
            <button
              key={i}
              onClick={() => destroyed
                ? game.restoreSoul(slotIndex, sv)
                : game.destroySoul(slotIndex, sv)}
              className={`inline px-1 rounded hover:bg-bg-hover ${
                destroyed ? 'line-through text-accent-red' : 'text-text-primary'
              }`}
              title={destroyed ? '복원' : '파괴 처리'}
            >
              {sv}
            </button>
          );
        }).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], [])}
        {totalSouls > 1 && ` (${destroyedCount}/${totalSouls})`}
      </div>

      {/* Status counters */}
      <div className="mb-1">
        <StatusChipsRow
          counters={monster.statusCounters}
          onAdjust={(key, delta) => game.adjustMonsterStatus(slotIndex, key, delta)}
        />
      </div>

      {/* Pattern */}
      {monster.currentPattern && !isDead && (
        <div className="mt-1 bg-accent-red/10 rounded px-2 py-1.5 border border-accent-red/20">
          <div className="text-xs font-medium text-accent-red">{monster.currentPattern.name}</div>
          <div className="text-[10px] text-text-secondary mt-0.5 leading-tight">
            {monster.currentPattern.targetValue !== undefined && (
              <div>방어: {monster.currentPattern.targetValue}{'★'.repeat(monster.currentPattern.targetPower ?? 0)}</div>
            )}
            {monster.currentPattern.damage !== undefined && monster.currentPattern.damage > 0 && (
              <div>피해: {monster.currentPattern.damage}</div>
            )}
            {monster.currentPattern.effectDescription && (
              <div className="text-text-muted">{monster.currentPattern.effectDescription}</div>
            )}
          </div>
        </div>
      )}
      {!monster.currentPattern && !isDead && (
        <div className="mt-1 text-[10px] text-text-muted italic">패턴 없음</div>
      )}

      <div className="flex gap-1 mt-2">
        <button
          onClick={() => game.drawMonsterPattern(slotIndex)}
          disabled={isDead}
          className="flex-1 px-1 py-1 text-[10px] bg-accent-blue/20 text-accent-blue rounded hover:bg-accent-blue/30 disabled:opacity-40"
        >
          패턴 뽑기
        </button>
        {!isDead ? (
          <button
            onClick={() => game.killMonster(slotIndex)}
            className="flex-1 px-1 py-1 text-[10px] bg-accent-red/20 text-accent-red rounded hover:bg-accent-red/30"
          >
            처치
          </button>
        ) : (
          <button
            onClick={() => game.reviveMonster(slotIndex)}
            className="flex-1 px-1 py-1 text-[10px] bg-bg-hover text-text-muted rounded"
            title="실수로 처치한 경우 되돌리기"
          >
            ↺ 부활
          </button>
        )}
      </div>

      <div className="text-[9px] text-text-muted mt-1">
        패턴 덱 {monster.patternDeck.length} / 버림 {monster.patternDiscard.length}
        {slot.queue.length > 0 && ` · 대기 ${slot.queue.length}`}
      </div>
    </div>
  );
}

// ============================================================
function DiscardPileModal({
  player, playerIndex, onClose, onCardHover, onCardLeave,
}: {
  player: PlayerState;
  playerIndex: number;
  onClose: () => void;
  onCardHover: (card: Card, e: React.MouseEvent) => void;
  onCardLeave: () => void;
}) {
  const game = useGameStore();
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-bg-secondary border border-border rounded-xl p-4 max-w-2xl w-[90%] max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-text-primary">
            {player.name}의 버린 패 ({player.discardPile.length}장)
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-sm">
            닫기 ✕
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {player.discardPile.length === 0 && (
            <span className="text-xs text-text-muted">비어 있습니다.</span>
          )}
          {player.discardPile.map(ci => {
            const card = getCardById(ci.cardId);
            if (!card) return null;
            return (
              <div
                key={ci.instanceId}
                onMouseEnter={e => onCardHover(card, e)}
                onMouseLeave={onCardLeave}
                onMouseMove={e => onCardHover(card, e)}
              >
                <CardDisplay
                  card={card}
                  size="sm"
                  onClick={() => {
                    game.recoverFromDiscard(playerIndex, ci.instanceId);
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="text-[10px] text-text-muted mt-3">
          카드를 클릭하면 손패로 되돌아갑니다.
        </div>
      </div>
    </div>
  );
}
