import { useState, useMemo } from 'react';
import { useCampaignStore } from '../../store/campaignStore';
import { getAllCards, getCardById, equipmentDefs, getEquipmentById } from '../../data/cards';
import { getAllMonsters, getMonsterById } from '../../data/monsters';
import { encodeCampaign, decodeCampaign } from '../../engine/campaignCodec';
import { CardDisplay, EquipmentDisplay, CardTooltip } from '../common/CardDisplay';
import type { Card, EquipmentDef } from '../../types';

interface Props {
  onStartBattle: () => void;
}

type EditorSection = 'deck' | 'equipment' | 'monsters';

export default function CampaignEditor({ onStartBattle }: Props) {
  const store = useCampaignStore();
  const [selectedPlayer, setSelectedPlayer] = useState(0);
  const [section, setSection] = useState<EditorSection>('deck');
  const [cardFilter, setCardFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [importCode, setImportCode] = useState('');
  const [showImport, setShowImport] = useState(false);

  const allCards = useMemo(() => getAllCards(), []);
  const allMonsters = useMemo(() => getAllMonsters(), []);

  const filteredCards = useMemo(() => {
    return allCards.filter(c => {
      if (typeFilter !== 'all' && c.cardType !== typeFilter) return false;
      if (cardFilter && !c.name.toLowerCase().includes(cardFilter.toLowerCase()) && !c.id.includes(cardFilter)) return false;
      return true;
    });
  }, [allCards, typeFilter, cardFilter]);

  const filteredEquipment = useMemo(() => {
    return equipmentDefs.filter(e => {
      if (cardFilter && !e.name.toLowerCase().includes(cardFilter.toLowerCase())) return false;
      return true;
    });
  }, [cardFilter]);

  const currentPlayer = store.config.players[selectedPlayer];
  const deckCards = currentPlayer?.deckCardIds.map(id => getCardById(id)).filter(Boolean) as Card[];

  function handleExport() {
    const code = encodeCampaign(store.config);
    navigator.clipboard.writeText(code);
    alert('캠페인 코드가 클립보드에 복사되었습니다!');
  }

  function handleImport() {
    const config = decodeCampaign(importCode.trim());
    if (config) {
      store.setConfig(config);
      setShowImport(false);
      setImportCode('');
    } else {
      alert('유효하지 않은 캠페인 코드입니다.');
    }
  }

  function handleCardHover(card: Card, e: React.MouseEvent) {
    setHoveredCard(card);
    setTooltipPos({ x: e.clientX + 12, y: e.clientY + 12 });
  }

  return (
    <div className="h-[calc(100vh-52px)] flex flex-col">
      {/* Top toolbar */}
      <div className="bg-bg-secondary border-b border-border px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-text-muted text-sm">플레이어 수:</span>
          {[1, 2, 3, 4].map(n => (
            <button
              key={n}
              onClick={() => store.setPlayerCount(n)}
              className={`w-8 h-8 rounded text-sm font-bold transition-colors ${
                store.config.players.length === n
                  ? 'bg-accent-purple text-white'
                  : 'bg-bg-card text-text-muted hover:bg-bg-hover'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={() => store.loadTutorial()} className="px-3 py-1.5 text-sm bg-accent-gold/20 text-accent-gold border border-accent-gold/40 rounded hover:bg-accent-gold/30 transition-colors">
          튜토리얼 불러오기
        </button>
        <button onClick={handleExport} className="px-3 py-1.5 text-sm bg-bg-card text-text-secondary border border-border rounded hover:bg-bg-hover transition-colors">
          내보내기
        </button>
        <button onClick={() => setShowImport(!showImport)} className="px-3 py-1.5 text-sm bg-bg-card text-text-secondary border border-border rounded hover:bg-bg-hover transition-colors">
          불러오기
        </button>
        <button onClick={onStartBattle} className="px-4 py-1.5 text-sm bg-accent-red text-white rounded font-medium hover:bg-accent-red/80 transition-colors">
          전투 시작
        </button>
      </div>

      {showImport && (
        <div className="bg-bg-tertiary border-b border-border px-4 py-2 flex items-center gap-2">
          <input
            value={importCode}
            onChange={e => setImportCode(e.target.value)}
            placeholder="캠페인 코드를 입력하세요..."
            className="flex-1 bg-bg-card border border-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple"
          />
          <button onClick={handleImport} className="px-3 py-1.5 text-sm bg-accent-purple text-white rounded hover:bg-accent-purple/80">
            확인
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - player tabs & section tabs */}
        <div className="w-48 bg-bg-secondary border-r border-border flex flex-col flex-shrink-0">
          <div className="p-2 border-b border-border">
            <div className="text-xs text-text-muted mb-1 px-1">플레이어</div>
            {store.config.players.map((p, i) => (
              <button
                key={i}
                onClick={() => setSelectedPlayer(i)}
                className={`w-full px-3 py-2 rounded text-sm text-left transition-colors mb-1 ${
                  selectedPlayer === i
                    ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40'
                    : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-[10px] text-text-muted">
                  HP: {p.hp} | 덱: {p.deckCardIds.length}장
                </div>
              </button>
            ))}
          </div>

          <div className="p-2 border-b border-border">
            <div className="text-xs text-text-muted mb-1 px-1">편집</div>
            {(['deck', 'equipment', 'monsters'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`w-full px-3 py-2 rounded text-sm text-left transition-colors mb-1 ${
                  section === s
                    ? 'bg-bg-tertiary text-text-primary'
                    : 'text-text-muted hover:bg-bg-hover hover:text-text-secondary'
                }`}
              >
                {s === 'deck' ? '덱 구성' : s === 'equipment' ? '장비 구성' : '몬스터 대기열'}
              </button>
            ))}
          </div>

          {section !== 'monsters' && currentPlayer && (
            <div className="p-2 flex-1 overflow-auto">
              <div className="text-xs text-text-muted mb-1 px-1">플레이어 설정</div>
              <div className="space-y-2 px-1">
                <div>
                  <label className="text-[10px] text-text-muted">이름</label>
                  <input
                    value={currentPlayer.name}
                    onChange={e => store.updatePlayer(selectedPlayer, { name: e.target.value })}
                    className="w-full bg-bg-card border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent-purple"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted">체력</label>
                  <input
                    type="number"
                    value={currentPlayer.hp}
                    onChange={e => store.updatePlayer(selectedPlayer, { hp: parseInt(e.target.value) || 1 })}
                    className="w-full bg-bg-card border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent-purple"
                    min={1}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {section === 'deck' && (
            <DeckEditor
              playerIndex={selectedPlayer}
              filteredCards={filteredCards}
              deckCards={deckCards}
              cardFilter={cardFilter}
              setCardFilter={setCardFilter}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              onCardHover={handleCardHover}
              onCardLeave={() => setHoveredCard(null)}
            />
          )}
          {section === 'equipment' && (
            <EquipmentEditor
              playerIndex={selectedPlayer}
              filteredEquipment={filteredEquipment}
              cardFilter={cardFilter}
              setCardFilter={setCardFilter}
            />
          )}
          {section === 'monsters' && (
            <MonsterQueueEditor allMonsters={allMonsters} />
          )}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCard && (
        <div className="fixed pointer-events-none" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
          <CardTooltip card={hoveredCard} />
        </div>
      )}
    </div>
  );
}

function DeckEditor({
  playerIndex, filteredCards, deckCards, cardFilter, setCardFilter, typeFilter, setTypeFilter, onCardHover, onCardLeave,
}: {
  playerIndex: number;
  filteredCards: Card[];
  deckCards: Card[];
  cardFilter: string;
  setCardFilter: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  onCardHover: (card: Card, e: React.MouseEvent) => void;
  onCardLeave: () => void;
}) {
  const store = useCampaignStore();

  return (
    <>
      {/* Card catalog */}
      <div className="flex-1 flex flex-col border-r border-border">
        <div className="p-3 border-b border-border flex items-center gap-2 flex-shrink-0">
          <input
            value={cardFilter}
            onChange={e => setCardFilter(e.target.value)}
            placeholder="카드 검색..."
            className="flex-1 bg-bg-card border border-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple"
          />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-bg-card border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none"
          >
            <option value="all">전체</option>
            <option value="element">원소</option>
            <option value="rune">룬</option>
            <option value="artifact">마도구</option>
          </select>
        </div>
        <div className="flex-1 overflow-auto p-3">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
            {filteredCards.map(card => (
              <div
                key={card.id}
                onMouseEnter={e => onCardHover(card, e)}
                onMouseLeave={onCardLeave}
                onMouseMove={e => onCardHover(card, e)}
              >
                <CardDisplay
                  card={card}
                  size="md"
                  onClick={() => store.addCardToDeck(playerIndex, card.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current deck */}
      <div className="w-72 flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">현재 덱</span>
            <span className="text-sm text-accent-gold font-bold">{deckCards.length}장</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {deckCards.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-8">
              좌측에서 카드를 클릭하여<br />덱에 추가하세요
            </div>
          ) : (
            <div className="space-y-1">
              {deckCards.map((card, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1.5 rounded bg-bg-card hover:bg-bg-hover transition-colors group"
                >
                  <CardDisplay card={card} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-text-primary truncate">{card.name}</div>
                    <div className="text-[10px] text-text-muted">
                      {card.cardType === 'element' && `${card.value}${'★'.repeat(card.power)}`}
                      {card.cardType === 'rune' && (card.symbol === '*' ? '×' : card.symbol)}
                      {card.cardType === 'artifact' && `${card.value ?? ''}${'★'.repeat(card.power)}`}
                    </div>
                  </div>
                  <button
                    onClick={() => store.removeCardFromDeck(playerIndex, i)}
                    className="text-accent-red opacity-0 group-hover:opacity-100 text-lg transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function EquipmentEditor({
  playerIndex, filteredEquipment, cardFilter, setCardFilter,
}: {
  playerIndex: number;
  filteredEquipment: EquipmentDef[];
  cardFilter: string;
  setCardFilter: (v: string) => void;
}) {
  const store = useCampaignStore();
  const player = store.config.players[playerIndex];

  const slotNames: Record<string, string> = {
    hat: '모자', robe: '로브', leftHand: '왼손', rightHand: '오른손',
  };

  return (
    <>
      {/* Equipment catalog */}
      <div className="flex-1 flex flex-col border-r border-border">
        <div className="p-3 border-b border-border flex-shrink-0">
          <input
            value={cardFilter}
            onChange={e => setCardFilter(e.target.value)}
            placeholder="장비 검색..."
            className="w-full bg-bg-card border border-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple"
          />
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {filteredEquipment.map(eq => (
            <EquipmentDisplay
              key={eq.id}
              equipment={eq}
              onClick={() => {
                if (eq.slot === 'accessory') {
                  store.addAccessory(playerIndex, eq.id);
                } else {
                  store.setEquipment(playerIndex, eq.slot, eq.id);
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* Current equipment */}
      <div className="w-72 flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-border flex-shrink-0">
          <span className="text-sm font-medium text-text-primary">장착 장비</span>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {(['hat', 'robe', 'leftHand', 'rightHand'] as const).map(slot => {
            const equipId = player?.equipment[slot] as string | undefined;
            const equip = equipId ? getEquipmentById(equipId) : null;
            return (
              <div key={slot}>
                <div className="text-[10px] text-text-muted mb-1">{slotNames[slot]}</div>
                {equip ? (
                  <div className="group relative">
                    <EquipmentDisplay equipment={equip} size="sm" />
                    <button
                      onClick={() => store.setEquipment(playerIndex, slot, undefined)}
                      className="absolute top-1 right-1 text-accent-red opacity-0 group-hover:opacity-100 text-sm"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-text-muted bg-bg-card rounded px-2 py-2 border border-dashed border-border">
                    비어 있음
                  </div>
                )}
              </div>
            );
          })}
          <div>
            <div className="text-[10px] text-text-muted mb-1">
              장신구 ({player?.equipment.accessories.length || 0}개)
            </div>
            {player?.equipment.accessories.map((accId, i) => {
              const equip = getEquipmentById(accId);
              if (!equip) return null;
              return (
                <div key={i} className="group relative mb-1">
                  <EquipmentDisplay equipment={equip} size="sm" />
                  <button
                    onClick={() => store.removeAccessory(playerIndex, i)}
                    className="absolute top-1 right-1 text-accent-red opacity-0 group-hover:opacity-100 text-sm"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function MonsterQueueEditor({ allMonsters }: { allMonsters: ReturnType<typeof getAllMonsters> }) {
  const store = useCampaignStore();
  const [monsterFilter, setMonsterFilter] = useState('');

  const filtered = allMonsters.filter(m =>
    !monsterFilter || m.name.toLowerCase().includes(monsterFilter.toLowerCase())
  );

  return (
    <>
      {/* Monster catalog */}
      <div className="flex-1 flex flex-col border-r border-border">
        <div className="p-3 border-b border-border flex-shrink-0">
          <input
            value={monsterFilter}
            onChange={e => setMonsterFilter(e.target.value)}
            placeholder="몬스터 검색..."
            className="w-full bg-bg-card border border-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple"
          />
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {filtered.map(m => (
            <div
              key={m.id}
              className="bg-bg-card border border-border rounded-lg p-3 cursor-pointer hover:bg-bg-hover transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-text-primary text-sm">{m.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  m.tier === 'boss' ? 'bg-accent-red/20 text-accent-red' :
                  m.tier === 'III' ? 'bg-accent-purple/20 text-accent-purple' :
                  m.tier === 'II' ? 'bg-accent-blue/20 text-accent-blue' :
                  'bg-bg-hover text-text-muted'
                }`}>
                  {m.tier === 'boss' ? 'BOSS' : `Tier ${m.tier}`}
                </span>
              </div>
              <div className="text-[10px] text-text-muted mb-2">
                소울: {Array.isArray(m.soulValue) ? m.soulValue.join(', ') : m.soulValue}{'★'.repeat(m.soulPower)}
                {m.keywords.length > 0 && ` | ${m.keywords.map(k => k.type).join(', ')}`}
              </div>
              <div className="flex gap-1 flex-wrap">
                {store.config.monsterSlots.map((_, si) => (
                  <button
                    key={si}
                    onClick={() => store.addMonsterToSlot(si, m.id)}
                    className="text-[10px] px-2 py-0.5 bg-bg-hover rounded text-text-muted hover:text-text-primary hover:bg-accent-purple/20 transition-colors"
                  >
                    슬롯 {si + 1}에 추가
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monster queue */}
      <div className="w-80 flex flex-col flex-shrink-0">
        <div className="p-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-medium text-text-primary">몬스터 대기열</span>
          <button
            onClick={() => store.addMonsterSlot()}
            className="text-xs px-2 py-1 bg-accent-purple/20 text-accent-purple rounded hover:bg-accent-purple/30 transition-colors"
          >
            + 슬롯 추가
          </button>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-4">
          {store.config.monsterSlots.map((slot, si) => (
            <div key={si} className="bg-bg-card border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-accent-blue">슬롯 {si + 1}</span>
                {store.config.monsterSlots.length > 1 && (
                  <button
                    onClick={() => store.removeMonsterSlot(si)}
                    className="text-accent-red text-xs hover:underline"
                  >
                    삭제
                  </button>
                )}
              </div>
              {slot.queue.length === 0 ? (
                <div className="text-xs text-text-muted py-2">비어 있음</div>
              ) : (
                <div className="space-y-1">
                  {slot.queue.map((mId, qi) => {
                    const m = getMonsterById(mId);
                    return (
                      <div key={qi} className="flex items-center gap-2 text-xs group">
                        <span className="text-text-muted w-4">{qi + 1}.</span>
                        <span className="flex-1 text-text-primary">{m?.name ?? mId}</span>
                        <span className="text-text-muted">
                          {m && (Array.isArray(m.soulValue) ? m.soulValue[0] : m.soulValue)}{'★'.repeat(m?.soulPower ?? 0)}
                        </span>
                        <button
                          onClick={() => store.removeMonsterFromSlot(si, qi)}
                          className="text-accent-red opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
