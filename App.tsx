
import React, { useState, useEffect, useCallback } from 'react';
import { MOCK_MACHINES, MOCK_USER } from './constants';
import { Machine, User, DealType } from './types';
import { 
  Search, 
  Menu, 
  LogIn, 
  PlusCircle, 
  MessageSquare, 
  User as UserIcon, 
  ChevronRight, 
  History, 
  MapPin, 
  Factory, 
  ShieldCheck,
  Star,
  Lock,
  ArrowRightCircle,
  X
} from 'lucide-react';

// Components
const Badge: React.FC<{ type: DealType }> = ({ type }) => {
  const styles = {
    RENTAL: 'bg-blue-100 text-blue-700 border-blue-200',
    SALE: 'bg-orange-100 text-orange-700 border-orange-200',
    RENT_TO_BUY: 'bg-green-100 text-green-700 border-green-200',
  };
  const labels = {
    RENTAL: 'レンタル可',
    SALE: '売買可',
    RENT_TO_BUY: '買取り相談可',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${styles[type]}`}>
      {labels[type]}
    </span>
  );
};

const MachineCard: React.FC<{ machine: Machine; onClick: () => void }> = ({ machine, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="relative aspect-[4/3]">
        <img src={machine.thumbnail} alt={machine.name} className="w-full h-full object-cover" />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {machine.dealTypes.map(t => <Badge key={t} type={t} />)}
        </div>
      </div>
      <div className="p-3">
        <div className="flex justify-between items-start mb-1">
          <p className="text-xs text-slate-500 font-medium">{machine.manufacturer}</p>
          <div className="flex items-center text-slate-400 text-[10px]">
            <MapPin size={10} className="mr-0.5" />
            {machine.location}
          </div>
        </div>
        <h3 className="font-bold text-slate-800 text-sm mb-2 line-clamp-1">{machine.name}</h3>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
          <div className="flex items-center">
            <span className="bg-slate-100 px-1.5 py-0.5 rounded mr-1">サイズ</span>
            {machine.size}
          </div>
          {machine.rentHistoryCount > 0 && (
            <div className="flex items-center text-blue-600 font-medium">
              <ShieldCheck size={12} className="mr-1" />
              実績あり
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Header: React.FC<{ user: User; onLogin: () => void }> = ({ user, onLogin }) => {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <div className="bg-slate-900 text-white p-1.5 rounded-lg font-black tracking-tighter">K-M</div>
        <h1 className="text-lg font-bold tracking-tight hidden sm:block">K-Market</h1>
      </div>
      
      <div className="flex items-center gap-4">
        {user.isLoggedIn ? (
          <div className="flex items-center gap-3">
            <button className="text-slate-600 hover:text-slate-900 relative">
              <MessageSquare size={22} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">2</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
              <img src={user.avatar} alt="avatar" />
            </div>
          </div>
        ) : (
          <button 
            onClick={onLogin}
            className="flex items-center gap-1.5 text-sm font-bold bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-800 transition-colors"
          >
            <LogIn size={16} />
            ログイン
          </button>
        )}
      </div>
    </header>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USER);
  const [machines] = useState<Machine[]>(MOCK_MACHINES);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'rent' | 'sale' | 'rtob'>('all');

  const filteredMachines = machines.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.manufacturer.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'rent') return matchesSearch && m.dealTypes.includes('RENTAL');
    if (activeTab === 'sale') return matchesSearch && m.dealTypes.includes('SALE');
    if (activeTab === 'rtob') return matchesSearch && m.dealTypes.includes('RENT_TO_BUY');
    return matchesSearch;
  });

  const handleLogin = () => {
    setCurrentUser(prev => ({ ...prev, isLoggedIn: true }));
  };

  const handleLogout = () => {
    setCurrentUser(prev => ({ ...prev, isLoggedIn: false }));
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <Header user={currentUser} onLogin={handleLogin} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Search & Intro */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl text-white mb-6">
            <h2 className="text-xl font-bold mb-2">解体現場を、もっと効率的に。</h2>
            <p className="text-slate-300 text-sm mb-6">重機・ダンプ・アタッチメントの「借りる・買う」を直接つなぐB2Bマーケット</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="メーカー、型式、アタッチメント名..."
                className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'all', label: 'すべて' },
              { id: 'rent', label: 'レンタル' },
              { id: 'sale', label: '売買' },
              { id: 'rtob', label: 'レンタル→買取り可' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                  activeTab === tab.id 
                    ? 'bg-slate-900 text-white border-slate-900' 
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* List */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredMachines.map(m => (
            <MachineCard 
              key={m.id} 
              machine={m} 
              onClick={() => setSelectedMachine(m)} 
            />
          ))}
        </div>
      </main>

      {/* Detail Modal / Slide-over */}
      {selectedMachine && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedMachine(null)} />
          <div className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
            <button 
              className="absolute top-4 right-4 p-2 bg-white/80 rounded-full hover:bg-white z-10 border border-slate-200"
              onClick={() => setSelectedMachine(null)}
            >
              <X size={20} />
            </button>

            {/* Images */}
            <div className="h-64 sm:h-80 bg-slate-200 overflow-hidden relative">
              <img src={selectedMachine.images[0]} className="w-full h-full object-cover" />
              <div className="absolute bottom-4 left-4 flex gap-1.5">
                {selectedMachine.dealTypes.map(t => <Badge key={t} type={t} />)}
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 mb-1">{selectedMachine.name}</h2>
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <span className="font-bold">{selectedMachine.manufacturer}</span>
                    <span>•</span>
                    <span>{selectedMachine.model}</span>
                    <span>•</span>
                    <span className="flex items-center"><MapPin size={14} className="mr-0.5"/>{selectedMachine.location}</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  {!currentUser.isLoggedIn ? (
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-center gap-3">
                      <Lock size={18} className="text-slate-400" />
                      <div>
                        <p className="text-xs font-bold text-slate-700">価格情報はログイン後に表示されます</p>
                        <button onClick={handleLogin} className="text-blue-600 text-[10px] font-bold underline">今すぐログイン</button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900 text-white p-4 rounded-xl">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-[10px] text-slate-400">レンタル目安 (日額)</span>
                        <span className="text-xl font-black">¥{selectedMachine.priceRental?.toLocaleString()}<span className="text-xs font-normal">〜</span></span>
                      </div>
                      <div className="flex justify-between items-baseline border-t border-white/10 pt-1 mt-1">
                        <span className="text-[10px] text-slate-400">売買参考価格</span>
                        <span className="text-lg font-bold">¥{selectedMachine.priceSale?.toLocaleString()}<span className="text-xs font-normal">〜</span></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Spec Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'サイズ', value: selectedMachine.size },
                  { label: '年式', value: currentUser.isLoggedIn ? `${selectedMachine.yearOfManufacture}年` : 'ログイン後' },
                  { label: '稼働時間', value: currentUser.isLoggedIn ? `${selectedMachine.operatingHours}h` : 'ログイン後' },
                  { label: '状態', value: currentUser.isLoggedIn ? `${selectedMachine.condition}/5` : 'ログイン後' },
                ].map((item, i) => (
                  <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm font-bold text-slate-800">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Logic: Login required details */}
              {currentUser.isLoggedIn ? (
                <div className="space-y-6">
                  <section>
                    <h3 className="font-bold flex items-center gap-2 mb-3 text-slate-800">
                      <History size={18} />
                      使用履歴・コンディション
                    </h3>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">主な使用用途</p>
                        <p className="text-sm">{selectedMachine.usageType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">現場規模</p>
                        <p className="text-sm">{selectedMachine.siteScale}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">修理・故障履歴</p>
                        <p className="text-sm">{selectedMachine.history}</p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="font-bold flex items-center gap-2 mb-3 text-slate-800">
                      <Factory size={18} />
                      出品者情報
                    </h3>
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-white">
                          <UserIcon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold">東関東リース株式会社</p>
                          <p className="text-[10px] text-slate-500">千葉県 • 業歴 30年</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star size={14} fill="currentColor" />
                        <span className="text-xs font-bold">4.8</span>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl text-center">
                  <h4 className="font-bold text-blue-900 mb-2">詳細情報を見るにはログインが必要です</h4>
                  <p className="text-xs text-blue-700 mb-4">使用履歴、修理状況、最短レンタル期間、出品者とのチャット機能が利用可能になります。</p>
                  <button 
                    onClick={handleLogin}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                  >
                    ログインして詳細を表示
                  </button>
                </div>
              )}

              {/* Action Bar (Sticky) */}
              {currentUser.isLoggedIn && (
                <div className="mt-8 pt-6 border-t border-slate-100 sticky bottom-0 bg-white flex gap-3">
                  <button className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all">
                    <MessageSquare size={18} />
                    在庫確認・チャット
                  </button>
                  <button className="px-6 border border-slate-200 rounded-xl hover:bg-slate-50">
                    <Star size={20} className="text-slate-400" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post Machine Overlay */}
      {isPosting && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsPosting(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-4">重機・ダンプを出品する</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">商材カテゴリー</label>
                <select className="w-full border border-slate-200 rounded-lg p-3 text-sm">
                  <option>解体用重機</option>
                  <option>ダンプ</option>
                  <option>アタッチメント</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">メーカー</label>
                  <input type="text" placeholder="例：コマツ" className="w-full border border-slate-200 rounded-lg p-3 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">型式</label>
                  <input type="text" placeholder="例：PC128US-11" className="w-full border border-slate-200 rounded-lg p-3 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">取引形態（複数選択可）</label>
                <div className="flex flex-wrap gap-2">
                  {['レンタル', '売買', 'レンタル後の買取り可'].map(label => (
                    <label key={label} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer text-sm">
                      <input type="checkbox" className="w-4 h-4" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <button 
                type="button"
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl mt-4"
                onClick={() => setIsPosting(false)}
              >
                出品を完了する (審査へ)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-20 px-6 flex items-center justify-between z-40 lg:hidden">
        <button className="flex flex-col items-center gap-1 text-slate-900">
          <Search size={24} />
          <span className="text-[10px] font-bold">探す</span>
        </button>
        <button 
          onClick={() => currentUser.isLoggedIn ? setIsPosting(true) : handleLogin()}
          className="flex flex-col items-center gap-1 -translate-y-4"
        >
          <div className="bg-slate-900 text-white p-4 rounded-full shadow-lg shadow-slate-300">
            <PlusCircle size={28} />
          </div>
          <span className="text-[10px] font-bold text-slate-900 mt-1">出品</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-slate-400">
          <UserIcon size={24} />
          <span className="text-[10px] font-bold">マイページ</span>
        </button>
      </nav>

      {/* Footer (Desktop) */}
      <footer className="hidden lg:block bg-white border-t border-slate-200 py-12 mt-12">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-slate-900 text-white p-1.5 rounded-lg font-black tracking-tighter">K-M</div>
              <h1 className="text-xl font-bold tracking-tight">K-Market</h1>
            </div>
            <p className="text-sm text-slate-500 max-w-sm">解体業界における「借りる・買う」の流動性を高め、資産の有効活用と現場の生産性向上を支援するプラットフォームです。</p>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 mb-4 text-sm">カテゴリー</h4>
            <ul className="text-sm text-slate-500 space-y-2">
              <li>解体用重機</li>
              <li>ダンプカー</li>
              <li>アタッチメント</li>
              <li>「探しています」投稿</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 mb-4 text-sm">サポート</h4>
            <ul className="text-sm text-slate-500 space-y-2">
              <li>利用規約</li>
              <li>プライバシーポリシー</li>
              <li>お問い合わせ</li>
              <li>運営会社</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

