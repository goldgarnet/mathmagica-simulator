import { useState } from 'react';
import CampaignEditor from './components/editor/CampaignEditor';
import BattleSimulator from './components/battle/BattleSimulator';
import { useGameStore } from './store/gameStore';
import { useCampaignStore } from './store/campaignStore';

type Tab = 'editor' | 'battle';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('editor');
  const game = useGameStore();
  const campaign = useCampaignStore();

  function handleStartBattle() {
    game.initGame(campaign.config);
    game.startRound();
    setActiveTab('battle');
  }

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      <header className="bg-gradient-to-b from-bg-secondary to-bg-primary border-b border-border px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-3 sm:gap-6 flex-shrink-0">
        <h1 className="font-decorative font-bold text-lg sm:text-2xl text-accent-gold tracking-widest text-shadow-glow whitespace-nowrap">
          ✦ MathMagica
        </h1>
        <nav className="flex gap-1">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-t-lg text-xs sm:text-sm font-display tracking-wide transition-colors ${
              activeTab === 'editor'
                ? 'bg-bg-tertiary text-text-primary border border-border border-b-transparent'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            에디터
          </button>
          <button
            onClick={() => setActiveTab('battle')}
            className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-t-lg text-xs sm:text-sm font-display tracking-wide transition-colors ${
              activeTab === 'battle'
                ? 'bg-bg-tertiary text-text-primary border border-border border-b-transparent'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            시뮬레이터
          </button>
        </nav>
      </header>
      <main className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'editor' && <CampaignEditor onStartBattle={handleStartBattle} />}
        {activeTab === 'battle' && <BattleSimulator />}
      </main>
    </div>
  );
}

export default App;
