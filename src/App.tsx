import { useState } from 'react';
import CampaignEditor from './components/editor/CampaignEditor';
import BattleSimulator from './components/battle/BattleSimulator';

type Tab = 'editor' | 'battle';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('editor');

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <header className="bg-bg-secondary border-b border-border px-6 py-3 flex items-center gap-6">
        <h1 className="text-xl font-bold text-accent-gold tracking-wider">
          MathMagica
        </h1>
        <nav className="flex gap-1">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === 'editor'
                ? 'bg-bg-tertiary text-text-primary border border-border border-b-transparent'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Campaign Editor
          </button>
          <button
            onClick={() => setActiveTab('battle')}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === 'battle'
                ? 'bg-bg-tertiary text-text-primary border border-border border-b-transparent'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Battle Simulator
          </button>
        </nav>
      </header>
      <main className="flex-1 overflow-hidden">
        {activeTab === 'editor' && <CampaignEditor onStartBattle={() => setActiveTab('battle')} />}
        {activeTab === 'battle' && <BattleSimulator />}
      </main>
    </div>
  );
}

export default App;
