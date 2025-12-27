'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_USER } from './constants';
import { Machine, User, DealType, MachineCategory } from './types';
import { supabase } from './lib/supabaseClient';
import { useMe } from './lib/useMe';
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

const Header: React.FC<{
  user: User;
  onLogin: () => void;
  onPost: () => void;
  onOpenMyPage: () => void;
}> = ({ user, onLogin, onPost, onOpenMyPage }) => {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <div className="bg-slate-900 text-white p-1.5 rounded-lg font-black tracking-tighter">K-M</div>
        <h1 className="text-lg font-bold tracking-tight hidden sm:block">K-Market</h1>
      </div>
      
      <div className="flex items-center gap-4">
        {user.isLoggedIn ? (
          <div className="flex items-center gap-3">
            <button
              onClick={onPost}
              className="hidden md:flex items-center gap-1.5 text-sm font-bold bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-800 transition-colors"
            >
              <PlusCircle size={18} />
              出品する
            </button>
            <button className="text-slate-600 hover:text-slate-900 relative">
              <MessageSquare size={22} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">2</span>
            </button>
            <button
              type="button"
              onClick={onOpenMyPage}
              className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-transparent hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
            </button>
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

const DEFAULT_THUMBNAIL =
  'https://images.pexels.com/photos/6003651/pexels-photo-6003651.jpeg?auto=compress&cs=tinysrgb&w=1200';

type PostImage = {
  file: File;
  previewUrl: string;
};

export default function App() {
  const router = useRouter();
  const { me, error: meError } = useMe();
  const isLoggedIn = !!me?.authUserId;

  const currentUser: User = { ...MOCK_USER, isLoggedIn };
  const [dbMachines, setDbMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dealFilter, setDealFilter] = useState<'all' | 'rent' | 'sale' | 'rtob'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | MachineCategory>('all');
  const [areaFilter, setAreaFilter] = useState('');

  // 出品フォーム用の状態（フロント側）
  const [postCategory, setPostCategory] = useState<'HEAVY_MACHINERY' | 'DUMP' | 'ATTACHMENT'>(
    'HEAVY_MACHINERY',
  );
  const [postMaker, setPostMaker] = useState('');
  const [postModel, setPostModel] = useState('');
  const [postSize, setPostSize] = useState('');
  const [postPrefecture, setPostPrefecture] = useState('');
  const [postDealRental, setPostDealRental] = useState(true);
  const [postDealSale, setPostDealSale] = useState(false);
  const [postDealRentToBuy, setPostDealRentToBuy] = useState(false);
  const [postRentalPrice, setPostRentalPrice] = useState('');
  const [postRentalUnit, setPostRentalUnit] = useState<'DAY' | 'MONTH'>('DAY');
  const [postSalePrice, setPostSalePrice] = useState('');
  const [postHours, setPostHours] = useState('');
  const [postCondition, setPostCondition] = useState<'1' | '2' | '3' | '4' | '5' | ''>('');
  const [postMinPeriod, setPostMinPeriod] = useState('');
  const [postMinPeriodUnit, setPostMinPeriodUnit] = useState<'DAY' | 'MONTH'>('DAY');
  const [postAvailableFrom, setPostAvailableFrom] = useState('');
  const [postUsageType, setPostUsageType] = useState('');
  const [postSiteScale, setPostSiteScale] = useState('');
  const [postHistory, setPostHistory] = useState('');
  const [postImages, setPostImages] = useState<PostImage[]>([]);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postMessage, setPostMessage] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredMachines = dbMachines.filter((m) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q === '' ||
      m.name.toLowerCase().includes(q) ||
      m.manufacturer.toLowerCase().includes(q) ||
      m.location.toLowerCase().includes(q);

    const matchesDeal =
      dealFilter === 'all'
        ? true
        : dealFilter === 'rent'
        ? m.dealTypes.includes('RENTAL')
        : dealFilter === 'sale'
        ? m.dealTypes.includes('SALE')
        : m.dealTypes.includes('RENT_TO_BUY');

    const matchesCategory =
      categoryFilter === 'all' ? true : m.category === (categoryFilter as MachineCategory);

    const area = areaFilter.trim();
    const matchesArea = area === '' || m.location.includes(area);

    return matchesSearch && matchesDeal && matchesCategory && matchesArea;
  });

  const handleLogin = () => {
    router.push('/auth');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleOpenPost = () => {
    if (!isLoggedIn) {
      handleLogin();
      return;
    }
    setPostError(null);
    setPostMessage(null);
    setPostImages([]);
    setPostPrefecture(me?.company?.prefecture ?? '');
    setIsPosting(true);
  };

  const handleClickImageUpload = () => {
    setPostError(null);
    fileInputRef.current?.click();
  };

  const handleChangeImages: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const files = event.target.files;
    if (!files) return;

    const existingCount = postImages.length;
    const incoming = Array.from(files);

    if (existingCount >= 5) {
      setPostError('画像は最大5枚までアップロードできます。');
      event.target.value = '';
      return;
    }

    const remainingSlots = 5 - existingCount;
    const allowedFiles = incoming.slice(0, remainingSlots);

    const validFiles: File[] = [];
    for (const f of allowedFiles) {
      if (!f.type.startsWith('image/')) {
        setPostError('画像ファイルのみアップロードできます。');
        continue;
      }
      validFiles.push(f);
    }

    const newImages: PostImage[] = validFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPostImages((prev) => [...prev, ...newImages]);
    event.target.value = '';
  };

  const handleRemovePostImage = (index: number) => {
    setPostImages((prev) => prev.filter((_, i) => i !== index));
  };

  const loadFavorites = useCallback(async () => {
    if (!me?.authUserId) {
      setFavoriteIds([]);
      return;
    }
    const { data, error } = await supabase
      .from('favorites')
      .select('machine_id')
      .eq('user_id', me.authUserId);
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load favorites', error);
      return;
    }
    setFavoriteIds((data ?? []).map((row: any) => row.machine_id as string));
  }, [me?.authUserId]);

  const handleOpenMyPage = () => {
    if (!isLoggedIn) {
      handleLogin();
      return;
    }
    router.push('/me');
  };

  const handleSubmitPost: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!me?.company?.id) {
      setPostError('会社情報が取得できませんでした。いったんログアウトして再ログインしてください。');
      return;
    }

    // 必須バリデーション
    if (postImages.length === 0) {
      setPostError('写真を1枚以上アップロードしてください。');
      return;
    }
    if (!postPrefecture.trim()) {
      setPostError('都道府県を入力してください。');
      return;
    }
    if (!postMaker.trim()) {
      setPostError('メーカーを入力してください。');
      return;
    }
    if (!postModel.trim()) {
      setPostError('型式を入力してください。');
      return;
    }
    if (!postSize.trim()) {
      setPostError('サイズを選択してください。');
      return;
    }
    if (!postHours.trim()) {
      setPostError('稼働時間を選択してください。');
      return;
    }
    if (!postCondition) {
      setPostError('状態（1〜5）を選択してください。');
      return;
    }

    const hasAnyDeal = postDealRental || postDealSale || postDealRentToBuy;
    if (!hasAnyDeal) {
      setPostError('取引形態を少なくとも1つ選択してください。');
      return;
    }
    if ((postDealRental || postDealRentToBuy) && postRentalPrice.trim() === '') {
      setPostError('レンタル金額（税込）を入力してください。');
      return;
    }
    if ((postDealSale || postDealRentToBuy) && postSalePrice.trim() === '') {
      setPostError('売買参考価格（税込）を入力してください。');
      return;
    }

    setPostSubmitting(true);
    setPostError(null);
    setPostMessage(null);

    const rentalPriceNumber =
      postDealRental && postRentalPrice.trim() !== '' ? Number(postRentalPrice) : null;
    const salePriceNumber =
      (postDealSale || postDealRentToBuy) && postSalePrice.trim() !== ''
        ? Number(postSalePrice)
        : null;
    const hoursNumber = postHours.trim() !== '' ? Number(postHours) : null;
    const conditionNumber = postCondition ? Number(postCondition) : null;
    const minPeriodNumber = postMinPeriod.trim() !== '' ? Number(postMinPeriod) : null;
    const availableFromDate = postAvailableFrom.trim() !== '' ? postAvailableFrom : null;

    // 画像アップロード（最大5枚）
    let imageUrls: string[] = [];
    if (postImages.length > 0) {
      try {
        const bucket = supabase.storage.from('machine-images');
        for (let i = 0; i < postImages.length; i += 1) {
          const file = postImages[i].file;
          const ext = file.name.split('.').pop() || 'jpg';
          const path = `${me.company.id}/${Date.now()}_${i}.${ext}`;
          const { error: uploadError } = await bucket.upload(path, file, {
            upsert: true,
          });
          if (uploadError) {
            throw uploadError;
          }
          const { data: publicUrlData } = bucket.getPublicUrl(path);
          imageUrls.push(publicUrlData.publicUrl);
        }
      } catch (err: any) {
        const msg: string | undefined = err?.message ?? err?.error_description;
        if (msg && /bucket not found/i.test(msg)) {
          setPostError(
            '画像保存用の Storage バケット「machine-images」が見つかりません。Supabase の Storage で「machine-images」という公開バケットを作成してください。',
          );
        } else if (msg && /row-level security/i.test(msg)) {
          setPostError(
            'Storage の RLS 設定で画像のアップロードがブロックされています。「machine-images」バケットへの INSERT を許可するポリシーを追加してください。',
          );
        } else {
          setPostError(msg ?? '画像のアップロードに失敗しました。');
        }
        setPostSubmitting(false);
        return;
      }
    }

    const { error } = await supabase.from('machines').insert({
      owner_company_id: me.company.id,
      title: `${postMaker} ${postModel}`.trim() || '無題の出品',
      category: postCategory,
      maker: postMaker || null,
      model: postModel || null,
      machine_class: postSize || null,
      spec_note: null,
      rental_enabled: postDealRental,
      sale_enabled: postDealSale || postDealRentToBuy,
      rental_price_daily: rentalPriceNumber,
      rental_price_unit: postRentalUnit,
      rental_min_period: minPeriodNumber,
      rental_min_unit: minPeriodNumber ? postMinPeriodUnit : null,
      sale_price: salePriceNumber,
      location_prefecture: postPrefecture || null,
      location_city: null,
      status: 'PUBLISHED',
      main_image_url: imageUrls[0] ?? null,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
      operating_hours: hoursNumber,
      condition: conditionNumber,
      available_from: availableFromDate,
      usage_type: postUsageType || null,
      site_scale: postSiteScale || null,
      history: postHistory || null,
    });

    if (error) {
      setPostError(error.message);
      setPostSubmitting(false);
      return;
    }

    // 最新の出品一覧を取得
    await loadDbMachines();

    setPostMessage('出品を登録しました。');
    setPostSubmitting(false);
    setIsPosting(false);
  };

  // DBの machines を Machine 型にマッピングして取得
  const loadDbMachines = useCallback(async () => {
    const { data, error } = await supabase
      .from('machines')
      .select(
        `
        id,
        owner_company_id,
        title,
        category,
        maker,
        model,
        machine_class,
        spec_note,
        rental_enabled,
        sale_enabled,
        rental_price_daily,
        rental_price_unit,
        rental_min_period,
        rental_min_unit,
        sale_price,
        location_prefecture,
        location_city,
        status,
        main_image_url,
        image_urls,
        year_of_manufacture,
        operating_hours,
        condition,
        usage_type,
        site_scale,
        history,
        available_from
      `,
      )
      .eq('status', 'PUBLISHED')
      .order('created_at', { ascending: false });

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load machines from Supabase', error);
      return;
    }

    const mapped: Machine[] =
      (data ?? []).map((row: any): Machine => {
        const dealTypes: DealType[] = [];
        if (row.rental_enabled) dealTypes.push('RENTAL');
        if (row.sale_enabled) dealTypes.push('SALE');

        const location = [row.location_prefecture, row.location_city].filter(Boolean).join(' ');
        const thumbnail = (row.main_image_url as string | null) || DEFAULT_THUMBNAIL;

        const imageUrls = (row.image_urls as string[] | null) ?? [];
        const images = imageUrls.length > 0 ? imageUrls : [thumbnail];

        let minRentPeriod: string | undefined;
        if (row.rental_min_period != null) {
          const unitLabel = row.rental_min_unit === 'MONTH' ? 'ヶ月' : '日';
          minRentPeriod = `${row.rental_min_period}${unitLabel}`;
        }

        return {
          id: row.id,
          category: (row.category as Machine['category']) ?? 'HEAVY_MACHINERY',
          name: row.title as string,
          manufacturer: (row.maker as string) ?? '',
          model: (row.model as string) ?? '',
          size: (row.machine_class as string) ?? '',
          location,
          thumbnail,
          images,
          dealTypes: dealTypes.length > 0 ? dealTypes : ['RENTAL'],
          rentalUnit: (row.rental_price_unit as 'DAY' | 'MONTH' | null) ?? 'DAY',
          priceRental: row.rental_price_daily ?? undefined,
          priceSale: row.sale_price ?? undefined,
          yearOfManufacture: row.year_of_manufacture ?? undefined,
          operatingHours: row.operating_hours ?? undefined,
          purchaseDate: undefined,
          usageType: row.usage_type ?? undefined,
          siteScale: row.site_scale ?? undefined,
          history: row.history ?? undefined,
          condition: (row.condition as number | null) ?? 3,
          sellerId: row.owner_company_id as string,
          rentHistoryCount: 0,
          minRentPeriod,
        };
      }) ?? [];

    setDbMachines(mapped);
  }, []);

  useEffect(() => {
    void loadDbMachines();
  }, [loadDbMachines]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const handleToggleFavorite = async (machineId: string) => {
    if (!isLoggedIn) {
      handleLogin();
      return;
    }
    if (!me?.authUserId) return;

    const already = favoriteIds.includes(machineId);
    if (already) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', me.authUserId)
        .eq('machine_id', machineId);
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to remove favorite', error);
        return;
      }
      setFavoriteIds((ids) => ids.filter((id) => id !== machineId));
    } else {
      const { error } = await supabase.from('favorites').insert({
        user_id: me.authUserId,
        machine_id: machineId,
      });
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to add favorite', error);
        return;
      }
      setFavoriteIds((ids) => [...ids, machineId]);
    }
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <Header
        user={currentUser}
        onLogin={handleLogin}
        onPost={handleOpenPost}
        onOpenMyPage={handleOpenMyPage}
      />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Search & Intro */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl text-white mb-6">
            <h2 className="text-xl font-bold mb-2">解体現場を、もっと効率的に。</h2>
            <p className="text-slate-300 text-sm mb-6">重機・ダンプ・アタッチメントの「借りる・買う」を直接つなぐB2Bマーケット</p>
            <div className="space-y-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 whitespace-nowrap">カテゴリ</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { id: 'all', label: 'すべて' },
                      { id: 'HEAVY_MACHINERY', label: '重機' },
                      { id: 'DUMP', label: 'ダンプ' },
                      { id: 'ATTACHMENT', label: 'アタッチメント' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoryFilter(c.id as any)}
                        className={`px-2 py-1 rounded-full border text-[11px] font-bold ${
                          categoryFilter === c.id
                            ? 'bg-white text-slate-900 border-white'
                            : 'bg-white/5 text-slate-200 border-white/20'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 whitespace-nowrap">エリア</span>
                  <input
                    type="text"
                    placeholder="都道府県・市区町村"
                    className="flex-1 rounded-full border border-white/20 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-white/40"
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs (取引形態） */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'all', label: 'すべて' },
              { id: 'rent', label: 'レンタル' },
              { id: 'sale', label: '売買' },
              { id: 'rtob', label: 'レンタル→買取り可' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDealFilter(tab.id as any)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                  dealFilter === tab.id 
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
                    <span className="flex items-center">
                      <MapPin size={14} className="mr-0.5" />
                      {selectedMachine.location}
                    </span>
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
                        <span className="text-[10px] text-slate-400">
                          レンタル目安 (
                          {selectedMachine.rentalUnit === 'MONTH' ? '月額' : '日額'})
                        </span>
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
                  { label: 'サイズ', value: selectedMachine.size || '-' },
                  {
                    label: '年式',
                    value: currentUser.isLoggedIn
                      ? selectedMachine.yearOfManufacture
                        ? `${selectedMachine.yearOfManufacture}年`
                        : '未設定'
                      : 'ログイン後',
                  },
                  {
                    label: '稼働時間',
                    value: currentUser.isLoggedIn
                      ? selectedMachine.operatingHours
                        ? `${selectedMachine.operatingHours}h`
                        : '未設定'
                      : 'ログイン後',
                  },
                  {
                    label: '状態',
                    value: currentUser.isLoggedIn
                      ? selectedMachine.condition
                        ? `${selectedMachine.condition}/5`
                        : '未設定'
                      : 'ログイン後',
                  },
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

                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl text-center">
                  <h4 className="font-bold text-blue-900 mb-4">詳細情報を見るにはログインが必要です</h4>
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
                  <button
                    type="button"
                    className="px-6 border border-slate-200 rounded-xl hover:bg-slate-50"
                    onClick={() => handleToggleFavorite(selectedMachine.id)}
                  >
                    <Star
                      size={20}
                      className={
                        favoriteIds.includes(selectedMachine.id)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-slate-400'
                      }
                    />
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
            <form className="space-y-4" onSubmit={handleSubmitPost}>
              {/* 写真（必須・最大5枚） */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  写真（最大5枚・スマホ/PCからアップロード） <span className="text-red-500">*</span>
                </label>
                {postImages.length === 0 ? (
                  <button
                    type="button"
                    onClick={handleClickImageUpload}
                    className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-sm text-slate-500 hover:bg-slate-50"
                  >
                    <PlusCircle size={20} className="mb-1" />
                    <span>写真を追加</span>
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {postImages.map((img, index) => (
                      <div
                        key={index}
                        className="relative h-16 w-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200"
                      >
                        <img
                          src={img.previewUrl}
                          alt={`upload-${index}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePostImage(index)}
                          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-black/70 text-white text-[10px] flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {postImages.length < 5 && (
                      <button
                        type="button"
                        onClick={handleClickImageUpload}
                        className="h-16 w-16 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-[10px] text-slate-500 hover:bg-slate-50"
                      >
                        <PlusCircle size={14} className="mb-0.5" />
                        追加
                      </button>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  className="hidden"
                  onChange={handleChangeImages}
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  スマホ・PC から最大5枚までアップロードできます。最低1枚は必須です。
                </p>
              </div>

              {/* 都道府県 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  都道府県（必須）
                </label>
                <input
                  type="text"
                  placeholder="例：東京都"
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                  value={postPrefecture}
                  onChange={(e) => setPostPrefecture(e.target.value)}
                />
              </div>

              {/* 商材カテゴリー */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  商材カテゴリー（必須）
                </label>
                <select
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                  value={postCategory}
                  onChange={(e) =>
                    setPostCategory(e.target.value as 'HEAVY_MACHINERY' | 'DUMP' | 'ATTACHMENT')
                  }
                >
                  <option value="HEAVY_MACHINERY">解体用重機</option>
                  <option value="DUMP">ダンプ</option>
                  <option value="ATTACHMENT">アタッチメント</option>
                </select>
              </div>

              {/* メーカー */}
                <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  メーカー（必須）
                </label>
                <input
                  type="text"
                  placeholder="例：コマツ"
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                  value={postMaker}
                  onChange={(e) => setPostMaker(e.target.value)}
                />
                </div>

              {/* 型式 */}
                <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">型式（必須）</label>
                <input
                  type="text"
                  placeholder="例：PC128US-11"
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                  value={postModel}
                  onChange={(e) => setPostModel(e.target.value)}
                />
                </div>

              {/* サイズ */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  サイズ（必須）
                </label>
                <select
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                  value={postSize}
                  onChange={(e) => setPostSize(e.target.value)}
                >
                  <option value="">選択してください</option>
                  <option value="0.25m3">0.25m3</option>
                  <option value="0.45m3">0.45m3</option>
                  <option value="0.7m3">0.7m3</option>
                  <option value="1.0m3">1.0m3</option>
                  <option value="2t">2t</option>
                  <option value="4t">4t</option>
                  <option value="10t">10t</option>
                  <option value="その他">その他</option>
                </select>
              </div>

              {/* 稼働時間 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  稼働時間（h・必須）
                </label>
                <select
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                  value={postHours}
                  onChange={(e) => setPostHours(e.target.value)}
                >
                  <option value="">選択してください</option>
                  <option value="500">〜500h</option>
                  <option value="1000">〜1,000h</option>
                  <option value="2000">〜2,000h</option>
                  <option value="3000">〜3,000h</option>
                  <option value="5000">〜5,000h</option>
                  <option value="8000">〜8,000h</option>
                  <option value="10000">10,000h以上</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-500">おおよその値で構いません。</p>
              </div>

              {/* 状態 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  状態（1〜5・必須）
                </label>
                <select
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                  value={postCondition}
                  onChange={(e) =>
                    setPostCondition(e.target.value as '1' | '2' | '3' | '4' | '5' | '')
                  }
                >
                  <option value="">選択してください</option>
                  <option value="5">5（とても良い）</option>
                  <option value="4">4（良い）</option>
                  <option value="3">3（普通）</option>
                  <option value="2">2（やや劣る）</option>
                  <option value="1">1（悪い）</option>
                </select>
              </div>

              {/* 使用用途・現場情報 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  使用用途・現場情報（任意）
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    type="text"
                    placeholder="主な使用用途（例：RC造解体、木造解体など）"
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                    value={postUsageType}
                    onChange={(e) => setPostUsageType(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="現場規模（例：戸建て中心、中・大規模案件など）"
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                    value={postSiteScale}
                    onChange={(e) => setPostSiteScale(e.target.value)}
                  />
                  <textarea
                    placeholder="修理・故障履歴など（任意）"
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm min-h-[80px]"
                    value={postHistory}
                    onChange={(e) => setPostHistory(e.target.value)}
                  />
                </div>
              </div>

              {/* 取引形態 */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  取引形態（複数選択可）
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={postDealRental}
                      onChange={(e) => setPostDealRental(e.target.checked)}
                    />
                    レンタル
                    </label>
                  <label className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={postDealSale}
                      onChange={(e) => setPostDealSale(e.target.checked)}
                    />
                    売買
                  </label>
                  <label className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={postDealRentToBuy}
                      onChange={(e) => setPostDealRentToBuy(e.target.checked)}
                    />
                    レンタル後の買取り可
                  </label>
                </div>
              </div>

              {/* レンタル条件 */}
              {(postDealRental || postDealRentToBuy) && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      レンタル金額（税込・必須）
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={0}
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                        placeholder="例：18000"
                        value={postRentalPrice}
                        onChange={(e) => setPostRentalPrice(e.target.value)}
                      />
                      <select
                        className="w-24 border border-slate-200 rounded-lg p-2 text-xs"
                        value={postRentalUnit}
                        onChange={(e) =>
                          setPostRentalUnit(e.target.value as 'DAY' | 'MONTH')
                        }
                      >
                        <option value="DAY">日額</option>
                        <option value="MONTH">月額</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      最低レンタル期間（任意）
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={0}
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                        placeholder="例：7"
                        value={postMinPeriod}
                        onChange={(e) => setPostMinPeriod(e.target.value)}
                      />
                      <select
                        className="w-24 border border-slate-200 rounded-lg p-2 text-xs"
                        value={postMinPeriodUnit}
                        onChange={(e) =>
                          setPostMinPeriodUnit(e.target.value as 'DAY' | 'MONTH')
                        }
                      >
                        <option value="DAY">日</option>
                        <option value="MONTH">ヶ月</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      利用可能開始日（任意）
                    </label>
                    <input
                      type="date"
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                      value={postAvailableFrom}
                      onChange={(e) => setPostAvailableFrom(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* 売買条件 */}
              {(postDealSale || postDealRentToBuy) && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    売買参考価格（税込・必須）
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                    placeholder="例：8500000"
                    value={postSalePrice}
                    onChange={(e) => setPostSalePrice(e.target.value)}
                  />
                </div>
              )}

              {postError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
                  {postError}
                </div>
              )}
              {postMessage && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  {postMessage}
                </div>
              )}

              <div className="flex gap-3 pt-2">
              <button 
                type="button"
                  className="flex-1 border border-slate-200 rounded-xl py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                onClick={() => setIsPosting(false)}
              >
                  キャンセル
              </button>
                <button
                  type="submit"
                  disabled={postSubmitting}
                  className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl disabled:opacity-60"
                >
                  {postSubmitting ? '登録中…' : '出品を登録する'}
              </button>
              </div>
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
          onClick={handleOpenPost}
          className="flex flex-col items-center gap-1 -translate-y-4"
        >
          <div className="bg-slate-900 text-white p-4 rounded-full shadow-lg shadow-slate-300">
            <PlusCircle size={28} />
          </div>
          <span className="text-[10px] font-bold text-slate-900 mt-1">出品</span>
        </button>
        <button
          onClick={handleOpenMyPage}
          className={`flex flex-col items-center gap-1 ${
            isLoggedIn ? 'text-slate-900' : 'text-slate-400'
          }`}
        >
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


