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
      <div className="h-full flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="font-decorative text-2xl sm:text-3xl font-bold text-accent-gold mb-4 text-shadow-glow">
            ◈ 전투 준비 ◈
          </h2>
          <p className="text-text-secondary mb-6 text-sm sm:text-base">
            캠페인 에디터에서 설정한 구성으로 전투를 시작합니다.
          </p>
          <button
            onClick={handleInit}
            className="px-6 py-3 bg-accent-purple text-white rounded-lg font-display tracking-wider hover:bg-accent-purple/80 transition-colors text-base sm:text-lg"
          >
            전투 초기화
          </button>
        </div>
      </div>
    );
  }

  if (game.phase === 'victory' || game.phase === 'defeat') {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className={`font-decorative text-4xl sm:text-6xl font-bold mb-4 text-shadow-glow tracking-widest ${
            game.phase === 'victory' ? 'text-accent-gold' : 'text-accent-red'
          }`}>
            {game.phase === 'victory' ? '✦ VICTORY ✦' : '☠ DEFEAT ☠'}
          </h2>
          <p className="text-text-secondary mb-6 text-sm sm:text-base">
            {game.phase === 'victory'
              ? '모든 몬스터를 처치했습니다!'
              : '전투가 종료되었습니다.'}
          </p>
          <button
            onClick={() => game.restartGame()}
            className="px-6 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 font-display tracking-wider"
          >
            다시 시작
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row lg:overflow-hidden overflow-y-auto">
      {/* Main battle area */}
      <div className="lg:flex-1 lg:min-h-0 flex flex-col lg:overflow-hidden">
        {/* Monster area */}
        <div className="bg-bg-secondary border-b border-border p-2 sm:p-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <span className="font-decorative font-bold text-sm sm:text-base text-accent-red flex items-center gap-2 text-shadow-glow">
              ⚔ 몬스터 영역
              <span className="font-mono-game text-text-secondary">— 라운드 {game.round}</span>
              {game.tutorialMode && (
                <span className="px-1.5 py-0.5 text-[9px] bg-accent-gold/20 text-accent-gold rounded font-display tracking-wider">
                  TUTORIAL
                </span>
              )}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => game.nextRound()}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-accent-gold text-bg-primary rounded font-display tracking-wide font-bold hover:bg-accent-gold/80"
                title="모든 플레이어 마나 +1, 모든 몬스터 패턴 갱신"
              >
                다음 라운드 ▶
              </button>
              <button
                onClick={() => game.declareVictory()}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-accent-green/20 text-accent-green border border-accent-green/40 rounded hover:bg-accent-green/30 font-display tracking-wide"
              >
                승리 선언
              </button>
              <button
                onClick={() => setShowForfeitConfirm(true)}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-accent-red/20 text-accent-red border border-accent-red/40 rounded hover:bg-accent-red/30 font-display tracking-wide"
              >
                포기
              </button>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1">
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
            <div className="p-2 sm:p-3 space-y-2 flex-shrink-0 border-b border-border">
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
            <div className="lg:flex-1 lg:min-h-0 bg-bg-secondary/40 p-2 sm:p-3 lg:overflow-hidden flex flex-col">
              <div className="flex items-center gap-1.5 mb-2 flex-shrink-0 flex-wrap">
                <span className="text-[10px] sm:text-xs text-text-muted uppercase tracking-wider font-display">
                  손패 ({activePlayer.hand.length}장)
                </span>
                <button
                  onClick={() => game.drawCard(apIdx)}
                  className="text-[10px] sm:text-xs px-2 py-0.5 bg-accent-blue/20 text-accent-blue rounded hover:bg-accent-blue/30 font-display tracking-wide border border-accent-blue/30"
                  title="덱에서 1장 뽑기 (덱이 비면 자동으로 버린 패를 섞음)"
                >
                  카드 뽑기 +1
                </button>
                <button
                  onClick={() => game.drawCards(apIdx, game.drawCount)}
                  className="text-[10px] sm:text-xs px-2 py-0.5 bg-accent-blue/10 text-accent-blue rounded hover:bg-accent-blue/30 font-display tracking-wide border border-accent-blue/20"
                >
                  +{game.drawCount}장
                </button>
                <button
                  onClick={() => game.reshuffleDiscard(apIdx)}
                  disabled={activePlayer.discardPile.length === 0}
                  className="text-[10px] sm:text-xs px-2 py-0.5 bg-bg-card text-text-secondary rounded hover:bg-bg-hover disabled:opacity-40 border border-border"
                >
                  버린 패 → 덱 ({activePlayer.discardPile.length})
                </button>
                <button
                  onClick={() => setShowDiscardPile(apIdx)}
                  disabled={activePlayer.discardPile.length === 0}
                  className="text-[10px] sm:text-xs px-2 py-0.5 bg-bg-card text-text-secondary rounded hover:bg-bg-hover disabled:opacity-40 border border-border"
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
                      className="text-[10px] sm:text-xs px-2 py-0.5 bg-accent-red/20 text-accent-red rounded hover:bg-accent-red/30 border border-accent-red/30"
                    >
                      선택 카드 버리기
                    </button>
                    <button
                      onClick={() => setPlaceAsEquals(v => !v)}
                      className={`text-[10px] sm:text-xs px-2 py-0.5 rounded border ${
                        placeAsEquals
                          ? 'bg-accent-gold text-bg-primary border-accent-gold'
                          : 'bg-accent-gold/20 text-accent-gold hover:bg-accent-gold/30 border-accent-gold/30'
                      }`}
                      title="활성화 후 마법열을 클릭하면 카드가 뒤집힌(등호) 형태로 배치됩니다"
                    >
                      = 등호로 두기 {placeAsEquals && '(ON)'}
                    </button>
                    <button
                      onClick={() => { setSelectedHandCard(null); setPlaceAsEquals(false); }}
                      className="text-[10px] sm:text-xs text-text-muted hover:text-text-primary"
                    >
                      선택 해제
                    </button>
                  </>
                )}
              </div>
              <div className="lg:flex-1 flex gap-2 overflow-x-auto pb-2 min-h-[120px]">
                {activePlayer.hand.length === 0 && (
                  <span className="text-xs text-text-muted self-center italic">
                    손패가 비어 있습니다. 카드 뽑기 버튼을 누르세요.
                  </span>
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

      {/* Sidebar — right on lg, bottom on smaller */}
      <div className="lg:w-80 lg:border-l lg:border-t-0 border-t border-border bg-bg-secondary flex lg:flex-col flex-row flex-shrink-0 lg:overflow-y-auto overflow-x-auto lg:max-h-full">
        {activePlayer && <EquipmentPanel player={activePlayer} playerIndex={apIdx} />}

        {game.players.length > 1 && (
          <div className="p-3 border-b lg:border-r-0 border-r border-border flex-shrink-0 min-w-[200px]">
            <div className="text-[10px] text-text-muted mb-2 uppercase tracking-wider font-display">플레이어 요약</div>
            <div className="space-y-1">
              {game.players.map((p, i) => (
                <div key={i} className={`text-xs px-2 py-1 rounded font-mono-game ${
                  i === apIdx ? 'bg-accent-purple/20 text-accent-purple' : 'text-text-secondary'
                }`}>
                  {p.name}: HP {p.hp}/{p.maxHp} · ✦{p.mana} · 손패 {p.hand.length}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden min-w-[240px]">
          <div className="px-3 py-2 border-b border-border flex-shrink-0">
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-display">게임 로그</span>
          </div>
          <div ref={logRef} className="flex-1 overflow-auto p-3 space-y-0.5">
            {game.log.map((entry, i) => (
              <div key={i} className={`text-[11px] leading-tight ${
                entry.type === 'phase' ? 'text-accent-gold font-display tracking-wide mt-2' :
                entry.type === 'damage' ? 'text-accent-red' :
                entry.type === 'kill' ? 'text-accent-green font-bold' :
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
  const hpPct = Math.max(0, Math.min(1, player.hp / Math.max(1, player.maxHp))) * 100;

  return (
    <div className="bg-gradient-to-r from-bg-tertiary to-bg-secondary border-b border-border px-3 sm:px-4 py-2 sm:py-3 flex-shrink-0 space-y-2">
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        <span className="font-decorative font-bold text-sm sm:text-lg text-accent-gold text-shadow-glow whitespace-nowrap">
          ⚜ {player.name}
        </span>

        {/* HP bar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => game.adjustHp(playerIndex, -1)}
            className="w-7 h-7 flex items-center justify-center bg-accent-red/30 hover:bg-accent-red/50 text-accent-red rounded-full text-base font-bold border border-accent-red/40"
            title="HP -1"
          >−</button>
          <div className="relative w-32 sm:w-44 h-7 bg-bg-card rounded-full overflow-hidden border border-accent-red/40 shadow-inner">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-red via-accent-red/90 to-accent-red/60 transition-all"
              style={{ width: `${hpPct}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-display font-bold text-text-primary tracking-wide" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
              ❤ {player.hp} / {player.maxHp}
            </div>
          </div>
          <button
            onClick={() => game.adjustHp(playerIndex, +1)}
            className="w-7 h-7 flex items-center justify-center bg-accent-red/30 hover:bg-accent-red/50 text-accent-red rounded-full text-base font-bold border border-accent-red/40"
            title="HP +1"
          >+</button>
        </div>

        {/* Mana orb */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => game.adjustMana(playerIndex, -1)}
            className="w-7 h-7 flex items-center justify-center bg-accent-blue/30 hover:bg-accent-blue/50 text-accent-blue rounded-full text-base font-bold border border-accent-blue/40"
            title="Mana -1"
          >−</button>
          <div className="px-3 py-1 bg-gradient-to-br from-accent-blue/30 to-accent-blue/10 border border-accent-blue/50 rounded-full text-sm font-display text-accent-blue font-bold min-w-[80px] text-center text-shadow-glow">
            ✦ {player.mana} 마나
          </div>
          <button
            onClick={() => game.adjustMana(playerIndex, +1)}
            className="w-7 h-7 flex items-center justify-center bg-accent-blue/30 hover:bg-accent-blue/50 text-accent-blue rounded-full text-base font-bold border border-accent-blue/40"
            title="Mana +1"
          >+</button>
        </div>

        <span className="text-xs text-text-muted font-mono-game">
          덱 <span className="text-text-primary">{player.deck.length}</span> ·
          <button onClick={onShowDiscard} className="ml-1 underline hover:text-text-primary">
            버림 <span>{player.discardPile.length}</span>
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
    <div className="flex items-center gap-1.5 sm:gap-2">
      <span className="text-[10px] sm:text-xs text-accent-gold w-12 sm:w-16 text-right flex-shrink-0 font-display tracking-wider uppercase">
        열 {lineIndex + 1}
      </span>
      <div
        className={`flex-1 min-h-[72px] flex items-center gap-1 px-2 sm:px-3 py-2 rounded-lg border-2 border-dashed transition-colors ${
          selectedHandCard
            ? (placeAsEquals
                ? 'border-accent-gold/60 bg-accent-gold/5 cursor-pointer'
                : 'border-accent-purple/60 bg-accent-purple/5 cursor-pointer')
            : 'border-border/60 bg-bg-card/40'
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
  counters, onAdjust, compact = false,
}: {
  counters: StatusCounters;
  onAdjust: (key: StatusKey, delta: number) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`${compact ? 'text-[9px]' : 'text-[10px]'} text-text-muted mr-1 uppercase tracking-wider`}>
        상태이상
      </span>
      {STATUS_KEYS.map(key => {
        const value = counters[key] ?? 0;
        const active = value > 0;
        return (
          <div
            key={key}
            className={`inline-flex items-center rounded border ${compact ? 'text-[10px]' : 'text-[11px]'} ${
              active
                ? 'bg-accent-purple/20 border-accent-purple/50 text-accent-purple'
                : 'bg-bg-card/40 border-border/50 text-text-muted'
            }`}
          >
            <button
              onClick={() => onAdjust(key, -1)}
              className={`${compact ? 'px-1' : 'px-1.5'} py-0.5 hover:bg-black/30 rounded-l-[3px] disabled:opacity-40 disabled:cursor-not-allowed font-bold`}
              disabled={value === 0}
              title={`${STATUS_LABELS[key]} -1`}
            >−</button>
            <span className={`${compact ? 'px-1' : 'px-1.5'} py-0.5 ${active ? 'font-semibold' : ''}`}>
              {STATUS_LABELS[key]} {value}
            </span>
            <button
              onClick={() => onAdjust(key, +1)}
              className={`${compact ? 'px-1' : 'px-1.5'} py-0.5 hover:bg-black/30 rounded-r-[3px] font-bold`}
              title={`${STATUS_LABELS[key]} +1`}
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

  const SLOT_ICONS: Record<string, string> = {
    '모자': '🎩', '로브': '🧥', '왼손': '🛡️', '오른손': '🪄', '장신구': '💍',
  };

  return (
    <div className="p-3 lg:border-b border-r lg:border-r-0 border-border flex-shrink-0 lg:max-h-[45vh] lg:overflow-y-auto min-w-[260px] lg:min-w-0">
      <div className="text-[10px] text-text-muted mb-2 uppercase tracking-wider font-display">
        {player.name}의 장비
      </div>
      <div className="space-y-2">
        {allEquips.map(({ equip, slotLabel }, i) => {
          const isUsed = player.equipmentUsedThisScenario.includes(equip.id);
          const isOncePerScenario = equip.activeUse?.cost.type === 'oncePerScenario' ||
                                    equip.activeUse?.cost.type === 'oncePerScenarioPermanent';
          const canUse = !!equip.activeUse && !isUsed && (
            equip.activeUse.cost.type !== 'mana' || player.mana >= equip.activeUse.cost.amount
          );
          const rarity = equip.rarity || 'common';
          const rarityBorder =
            rarity === 'legendary' ? 'border-rarity-legendary/60' :
            rarity === 'epic' ? 'border-rarity-epic/60' :
            rarity === 'rare' ? 'border-rarity-rare/60' :
            'border-rarity-common/40';

          return (
            <div
              key={i}
              className={`bg-gradient-to-br from-bg-card to-bg-secondary rounded-lg p-2 border ${rarityBorder} ${isUsed ? 'opacity-40 grayscale' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{SLOT_ICONS[slotLabel] ?? '⚙️'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-decorative font-bold text-sm text-text-primary text-shadow-glow truncate">
                    {equip.name}
                  </div>
                  <div className="text-[9px] text-text-muted uppercase tracking-widest">
                    {slotLabel}
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-text-secondary mb-1.5 leading-snug">
                {equip.effectDescription}
              </div>
              {equip.activeUse && (
                <div className="flex gap-1">
                  <button
                    onClick={() => game.useEquipment(playerIndex, equip.id)}
                    disabled={!canUse}
                    className={`flex-1 px-2 py-1 text-[10px] rounded font-display tracking-wide transition-colors ${
                      canUse
                        ? 'bg-accent-purple/20 text-accent-purple hover:bg-accent-purple/30 border border-accent-purple/30'
                        : 'bg-bg-hover text-text-muted cursor-not-allowed border border-border'
                    }`}
                  >
                    {isUsed ? '✓ 사용 완료' : (
                      <>
                        {equip.activeUse.label}
                        {equip.activeUse.cost.type === 'mana' && ` ✦${equip.activeUse.cost.amount}`}
                        {isOncePerScenario && ' [1회]'}
                      </>
                    )}
                  </button>
                  {isUsed && isOncePerScenario && (
                    <button
                      onClick={() => game.resetEquipmentUse(playerIndex, equip.id)}
                      className="px-1.5 py-1 text-[10px] bg-bg-hover text-text-muted rounded border border-border"
                      title="사용 표시를 초기화"
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
          <div className="text-[10px] text-text-muted italic">장착된 장비가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

// ============================================================
const TIER_STYLES: Record<string, { border: string; gradient: string; ribbon: string; label: string }> = {
  I:    { border: 'border-rarity-common',    gradient: 'from-rarity-common/15 to-transparent',    ribbon: 'bg-rarity-common/30 text-rarity-common',    label: 'Ⅰ' },
  II:   { border: 'border-rarity-rare',      gradient: 'from-rarity-rare/20 to-transparent',      ribbon: 'bg-rarity-rare/30 text-rarity-rare',        label: 'Ⅱ' },
  III:  { border: 'border-rarity-epic',      gradient: 'from-rarity-epic/20 to-transparent',      ribbon: 'bg-rarity-epic/30 text-rarity-epic',        label: 'Ⅲ' },
  boss: { border: 'border-rarity-legendary', gradient: 'from-accent-red/25 via-accent-red/10 to-transparent', ribbon: 'bg-accent-red/30 text-accent-red border border-accent-red/40', label: 'BOSS' },
};

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
        <div className="w-52 min-h-[14rem] border border-dashed border-border/60 rounded-xl flex items-center justify-center text-xs text-text-muted flex-shrink-0 font-display tracking-wider">
          ◇ 슬롯 {slotIndex + 1}
        </div>
      );
    }
    return (
      <div className="w-52 min-h-[14rem] border border-border/50 rounded-xl flex flex-col items-center justify-center gap-2 text-xs text-text-muted bg-bg-card/30 flex-shrink-0">
        <span className="font-display tracking-wider">대기열 {slot.queue.length}</span>
        <button
          onClick={() => game.spawnNextMonsterInSlot(slotIndex)}
          className="px-3 py-1.5 text-xs bg-accent-purple/20 text-accent-purple rounded border border-accent-purple/30 hover:bg-accent-purple/30 font-display tracking-wide"
        >
          다음 소환
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
  const tier = TIER_STYLES[def.tier] || TIER_STYLES.I;

  return (
    <div
      className={`card-frame w-52 rounded-xl border-2 p-0 flex-shrink-0 transition-all overflow-hidden ${
        isDead ? 'border-border/30 opacity-40 grayscale' : `${tier.border}`
      } ${def.tier === 'boss' && !isDead ? 'shadow-[0_0_20px_-4px_rgba(255,90,110,0.5)]' : ''}`}
      style={{ background: 'linear-gradient(to bottom, var(--color-bg-card), var(--color-bg-secondary))' }}
    >
      {/* Top gradient flare */}
      <div className={`absolute inset-0 bg-gradient-to-b ${tier.gradient} pointer-events-none`} />

      <div className="relative p-2.5">
        {/* Header: name + tier ribbon */}
        <div className="flex items-start justify-between mb-1.5 gap-2">
          <h3 className={`font-decorative font-bold text-base leading-tight text-shadow-glow ${
            isDead ? 'line-through text-text-muted' : 'text-text-primary'
          }`}>
            {def.name}
          </h3>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-display font-bold tracking-wider ${tier.ribbon}`}>
            {tier.label}
          </span>
        </div>

        {/* Soul display */}
        <div className="text-[10px] mb-1.5 flex flex-wrap items-baseline gap-x-1">
          <span className="text-text-muted uppercase tracking-wider">소울</span>
          <span className="text-accent-gold text-shadow-glow">{'★'.repeat(def.soulPower)}</span>
          {soulValues.map((sv, i) => {
            const destroyed = monster.destroyedSouls.includes(sv);
            return (
              <button
                key={i}
                onClick={() => destroyed
                  ? game.restoreSoul(slotIndex, sv)
                  : game.destroySoul(slotIndex, sv)}
                className={`font-mono-game font-bold px-1 rounded hover:bg-bg-hover transition-colors ${
                  destroyed ? 'line-through text-accent-red' : 'text-text-primary'
                }`}
                title={destroyed ? '복원' : '파괴 처리'}
              >
                {sv}
              </button>
            );
          })}
          {totalSouls > 1 && (
            <span className="text-text-muted text-[9px] ml-auto">({destroyedCount}/{totalSouls})</span>
          )}
        </div>

        {/* Status counters */}
        <div className="mb-1.5">
          <StatusChipsRow
            counters={monster.statusCounters}
            onAdjust={(key, delta) => game.adjustMonsterStatus(slotIndex, key, delta)}
            compact
          />
        </div>

        {/* Pattern */}
        {monster.currentPattern && !isDead && (
          <div className="mt-1.5 bg-gradient-to-br from-accent-red/20 to-accent-red/5 rounded-lg px-2 py-1.5 border border-accent-red/30">
            <div className="font-decorative font-bold text-sm text-accent-red text-shadow-glow leading-tight">
              ⚔ {monster.currentPattern.name}
            </div>
            <div className="text-[10px] text-text-secondary mt-1 leading-relaxed space-y-0.5">
              {monster.currentPattern.targetValue !== undefined && (
                <div>
                  <span className="text-text-muted">방어선</span>{' '}
                  <span className="font-mono-game text-text-primary">
                    {monster.currentPattern.targetValue}
                  </span>
                  <span className="text-accent-gold ml-0.5">
                    {'★'.repeat(monster.currentPattern.targetPower ?? 0)}
                  </span>
                </div>
              )}
              {monster.currentPattern.damage !== undefined && monster.currentPattern.damage > 0 && (
                <div>
                  <span className="text-text-muted">피해</span>{' '}
                  <span className="font-mono-game text-accent-red font-bold">
                    {monster.currentPattern.damage}
                  </span>
                </div>
              )}
              {monster.currentPattern.effectDescription && (
                <div className="text-text-muted italic">{monster.currentPattern.effectDescription}</div>
              )}
            </div>
          </div>
        )}
        {!monster.currentPattern && !isDead && (
          <div className="mt-1.5 text-[10px] text-text-muted italic text-center py-1 border border-dashed border-border/40 rounded">
            패턴 없음
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => game.drawMonsterPattern(slotIndex)}
            disabled={isDead}
            className="flex-1 px-1 py-1 text-[10px] bg-accent-blue/20 text-accent-blue border border-accent-blue/30 rounded hover:bg-accent-blue/30 disabled:opacity-40 font-display tracking-wide"
          >
            패턴 뽑기
          </button>
          {!isDead ? (
            <button
              onClick={() => game.killMonster(slotIndex)}
              className="flex-1 px-1 py-1 text-[10px] bg-accent-red/20 text-accent-red border border-accent-red/30 rounded hover:bg-accent-red/30 font-display tracking-wide font-bold"
            >
              처치
            </button>
          ) : (
            <button
              onClick={() => game.reviveMonster(slotIndex)}
              className="flex-1 px-1 py-1 text-[10px] bg-bg-hover text-text-muted border border-border rounded font-display tracking-wide"
              title="실수로 처치한 경우 되돌리기"
            >
              ↺ 부활
            </button>
          )}
        </div>

        <div className="text-[9px] text-text-muted mt-1.5 flex items-center justify-between font-mono-game">
          <span>덱 {monster.patternDeck.length} · 버림 {monster.patternDiscard.length}</span>
          {slot.queue.length > 0 && (
            <span className="text-accent-purple">대기 {slot.queue.length}</span>
          )}
        </div>
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
