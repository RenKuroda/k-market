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
  ChevronDown,
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
    <span className={`text-sm font-bold px-3 py-1 rounded border ${styles[type]}`}>
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
        <div className="flex justify-between items-start mb-1.5">
          <p className="text-sm text-slate-500 font-medium">{machine.manufacturer}</p>
          <div className="flex items-center text-slate-400 text-xs">
            <MapPin size={12} className="mr-0.5" />
            {machine.location}
          </div>
        </div>
        <h3 className="font-bold text-slate-800 text-base mb-2 line-clamp-1">{machine.name}</h3>
        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
          <div className="flex items-center">
            <span className="bg-slate-100 px-1.5 py-0.5 rounded mr-1 text-xs">サイズ</span>
            <span className="whitespace-nowrap">{machine.size}</span>
          </div>
          {machine.rentHistoryCount > 0 && (
            <div className="flex items-center text-blue-600 font-semibold">
              <ShieldCheck size={14} className="mr-1" />
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
  searchQuery: string;
  onChangeSearch: (value: string) => void;
  categoryFilter: 'all' | MachineCategory;
  onChangeCategory: (value: 'all' | MachineCategory) => void;
  areaFilter: string;
  onChangeArea: (value: string) => void;
}> = ({
  user,
  onLogin,
  onPost,
  onOpenMyPage,
  searchQuery,
  onChangeSearch,
  categoryFilter,
  onChangeCategory,
  areaFilter,
  onChangeArea,
}) => {
  const [isAreaOpen, setIsAreaOpen] = useState(false);
  const selectedAreaLabel = areaFilter || '全国';

  return (
    <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-sm">
      <div className="w-full px-4 py-3 flex items-center justify-between gap-3">
        {/* 左側：ロゴ + 検索 + カテゴリ + エリア */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* ロゴ */}
          <div className="flex items-center gap-2 flex-none">
            <div className="bg-white text-slate-900 p-1.5 rounded-lg font-black tracking-tighter">
              K-M
            </div>
        <h1 className="text-lg font-bold tracking-tight hidden sm:block">K-Market</h1>
      </div>
      
          {/* 検索 */}
          <div className="relative w-[200px] flex-none">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="メーカー、型式、アタッチメント名..."
              className="w-full bg-white/10 border border-white/20 rounded-full py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
              value={searchQuery}
              onChange={(e) => onChangeSearch(e.target.value)}
            />
          </div>

          {/* カテゴリ（タブ風） */}
          <div className="hidden md:flex items-end gap-6 flex-none">
            {[
              { id: 'all', label: 'すべて' },
              { id: 'HEAVY_MACHINERY', label: '重機' },
              { id: 'DUMP', label: 'ダンプ' },
              { id: 'ATTACHMENT', label: 'アタッチメント' },
            ].map((c) => {
              const isActive = categoryFilter === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onChangeCategory(c.id as any)}
                  className={`relative pb-2 text-sm font-bold transition-colors ${
                    isActive ? 'text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {c.label}
                  <span
                    className={`absolute left-0 right-0 -bottom-0.5 h-0.5 rounded-full transition-all ${
                      isActive ? 'bg-white' : 'bg-transparent'
                    }`}
                  />
            </button>
              );
            })}
            </div>

          {/* エリア */}
          <div className="relative hidden sm:block flex-none">
            <button
              type="button"
              onClick={() => setIsAreaOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] sm:text-xs text-white hover:bg-white/10"
            >
              <span className="truncate max-w-[80px]">{selectedAreaLabel}</span>
              <ChevronDown size={14} className="text-slate-300" />
            </button>

            {isAreaOpen && (
              <div className="absolute left-0 mt-2 w-[320px] max-h-[70vh] overflow-y-auto rounded-xl bg-slate-800 text-white shadow-xl z-50 p-3">
                {PREFECTURE_GROUPS.map((group) => (
                  <div key={group.label} className="mb-3 last:mb-0">
                    <div className="text-xs font-bold bg-slate-700 px-2 py-1 rounded">
                      {group.label}
          </div>
                    <div className="mt-1 grid grid-cols-3 gap-1">
                      {group.prefectures.map((pref) => (
                        <button
                          key={pref}
                          type="button"
                          onClick={() => {
                            onChangeArea(pref);
                            setIsAreaOpen(false);
                          }}
                          className={`text-[11px] px-2 py-1 rounded hover:bg-slate-600 text-left ${
                            areaFilter === pref ? 'bg-slate-600 font-bold' : ''
                          }`}
                        >
                          {pref}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右側：出品する / アイコン */}
        <div className="flex items-center gap-3 flex-none">
        {user.isLoggedIn ? (
            <>
            <button
              onClick={onPost}
                className="hidden md:flex items-center gap-1.5 text-xs sm:text-sm font-bold bg-white text-slate-900 px-3 py-2 rounded-full hover:bg-slate-100 transition-colors"
            >
                <PlusCircle size={16} />
              出品する
            </button>
              <button className="hidden sm:inline-flex text-slate-200 hover:text-white relative">
                <MessageSquare size={20} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  2
                </span>
            </button>
              <button
                type="button"
                onClick={onOpenMyPage}
                className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden border border-slate-600 hover:border-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              </button>
            </>
        ) : (
          <button 
            onClick={onLogin}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-bold bg-white text-slate-900 px-3 sm:px-4 py-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <LogIn size={16} />
            ログイン
          </button>
        )}
        </div>
      </div>
    </header>
  );
};

const DEFAULT_THUMBNAIL =
  'https://images.pexels.com/photos/6003651/pexels-photo-6003651.jpeg?auto=compress&cs=tinysrgb&w=1200';

const PREFECTURE_GROUPS: { label: string; prefectures: string[] }[] = [
  {
    label: '北海道・東北',
    prefectures: ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
  },
  {
    label: '関東',
    prefectures: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
  },
  {
    label: '中部',
    prefectures: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県'],
  },
  {
    label: '東海',
    prefectures: ['静岡県', '愛知県', '三重県'],
  },
  {
    label: '近畿',
    prefectures: ['滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
  },
  {
    label: '中国',
    prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'],
  },
  {
    label: '四国',
    prefectures: ['徳島県', '香川県', '愛媛県', '高知県'],
  },
  {
    label: '九州・沖縄',
    prefectures: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'],
  },
];

type PostImage = {
  file: File;
  previewUrl: string;
};

const MAKER_OPTIONS_BY_CATEGORY: Record<'HEAVY_MACHINERY' | 'ATTACHMENT' | 'DUMP', string[]> = {
  HEAVY_MACHINERY: [
    'コマツ',
    '日立建機',
    'コベルコ建機',
    '住友建機',
    'ヤンマー',
    'クボタ',
    '加藤製作所',
    'タダノ',
    '竹内製作所',
    '北越工業（AIRMAN）',
    '古河ロックドリル',
    '酒井重工業',
    '日本キャタピラー（※国内販売法人）',
    'IHI建機',
    '諸岡',
  ],
  ATTACHMENT: [
    'オカダアイヨン',
    'タグチ工業',
    'NPK（日進機械）',
    '古河ロックドリル',
    '東空（TOKU）',
    '丸順',
    '松本製作所',
    '大和機工',
    '油圧ブレーカ工業',
    '北川鉄工所',
    '神鋼造機',
    '協和機械製作所',
    '阪神機械',
    '杉山重機',
    '飯田鉄工',
    '北村製作所',
    '幸和工業',
    '山崎製作所',
    '関東鉄工',
    '明和製作所',
    '日立建機マグネット（建機内製系）',
    '三菱電機マグネット（磁力装置系）',
    '住友重機械マグネット（磁力装置系）',
    '東邦電磁工業',
    'カネテック',
  ],
  DUMP: [
    'いすゞ',
    '日野自動車',
    '三菱ふそう',
    'UDトラックス',
    'トヨタ',
    'マツダ',
    '日産自動車',
    '新明和工業',
    '極東開発工業',
    '東邦車輌',
    '日本トレクス',
    '花見台自動車',
    '森田自動車',
    '安全自動車',
    '小平産業',
    '昭和飛行機工業',
    '諸岡',
    'コマツ',
    '日立建機',
    '住友建機',
    '加藤製作所',
  ],
};

export default function App() {
  const router = useRouter();
  const { me, error: meError } = useMe();
  const isLoggedIn = !!me?.authUserId;

  const avatarUrl =
    ((me?.avatarUrl as string | null | undefined) ?? null) || MOCK_USER.avatar;

  const currentUser: User = { ...MOCK_USER, isLoggedIn, avatar: avatarUrl };
  const [dbMachines, setDbMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dealFilter, setDealFilter] = useState<'all' | 'rent' | 'sale'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | MachineCategory>('all');
  const [areaFilter, setAreaFilter] = useState('');

  // 出品フォーム用の状態（フロント側）
  const [postCategory, setPostCategory] = useState<'HEAVY_MACHINERY' | 'DUMP' | 'ATTACHMENT'>(
    'HEAVY_MACHINERY',
  );
  const [postMaker, setPostMaker] = useState('');
  const [postMakerSelect, setPostMakerSelect] = useState<string>('');
  const [postTitle, setPostTitle] = useState('');
  const [postSize, setPostSize] = useState('');
  const [postPrefecture, setPostPrefecture] = useState('');
  const [postDealRental, setPostDealRental] = useState(true);
  const [postDealSale, setPostDealSale] = useState(false);
  const [postRentalPrice, setPostRentalPrice] = useState('');
  const [postRentalUnit, setPostRentalUnit] = useState<'DAY' | 'MONTH'>('DAY');
  const [postSalePrice, setPostSalePrice] = useState('');
  const [postHours, setPostHours] = useState('');
  const [postCondition, setPostCondition] = useState<'1' | '2' | '3' | '4' | '5' | ''>('');
  const [postMinPeriod, setPostMinPeriod] = useState('');
  const [postMinPeriodUnit, setPostMinPeriodUnit] = useState<'DAY' | 'MONTH'>('DAY');
  const [postAvailableFrom, setPostAvailableFrom] = useState('');
  const [postUsageNote, setPostUsageNote] = useState('');
  const [postImages, setPostImages] = useState<PostImage[]>([]);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postMessage, setPostMessage] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const makerOptions = MAKER_OPTIONS_BY_CATEGORY[postCategory];

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
        : m.dealTypes.includes('SALE');

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
    if (!postTitle.trim()) {
      setPostError('タイトルを入力してください。');
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

    const hasAnyDeal = postDealRental || postDealSale;
    if (!hasAnyDeal) {
      setPostError('取引形態を少なくとも1つ選択してください。');
      return;
    }
    if (postDealRental && postRentalPrice.trim() === '') {
      setPostError('レンタル金額（税込）を入力してください。');
      return;
    }
    if (postDealSale && postSalePrice.trim() === '') {
      setPostError('売買参考価格（税込）を入力してください。');
      return;
    }

    setPostSubmitting(true);
    setPostError(null);
    setPostMessage(null);

    const normalizeNumber = (v: string) => {
      const digits = v.replace(/,/g, '').trim();
      return digits ? Number(digits) : null;
    };

    const rentalPriceNumber =
      postDealRental && postRentalPrice.trim() !== '' ? normalizeNumber(postRentalPrice) : null;
    const salePriceNumber =
      postDealSale && postSalePrice.trim() !== '' ? normalizeNumber(postSalePrice) : null;
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
      title: postTitle.trim(),
      category: postCategory,
      maker: postMaker || null,
      model: null,
      machine_class: postSize || null,
      spec_note: null,
      rental_enabled: postDealRental,
      sale_enabled: postDealSale,
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
      usage_type: postUsageNote || null,
      site_scale: null,
      history: null,
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

        const location = row.location_prefecture || '';
        const thumbnail = (row.main_image_url as string | null) || DEFAULT_THUMBNAIL;

        const imageUrls = (row.image_urls as string[] | null) ?? [];
        const images = imageUrls.length > 0 ? imageUrls : [thumbnail];

        let minRentPeriod: string | undefined;
        if (row.rental_min_period != null) {
          const unitLabel = row.rental_min_unit === 'MONTH' ? 'ヶ月' : '日';
          minRentPeriod = `${row.rental_min_period}${unitLabel}`;
        }

        const rawCondition = row.condition as number | null;
        const condition: 1 | 2 | 3 | 4 | 5 =
          rawCondition === 1 ||
          rawCondition === 2 ||
          rawCondition === 3 ||
          rawCondition === 4 ||
          rawCondition === 5
            ? rawCondition
            : 3;

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
          condition,
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
        searchQuery={searchQuery}
        onChangeSearch={setSearchQuery}
        categoryFilter={categoryFilter}
        onChangeCategory={setCategoryFilter}
        areaFilter={areaFilter}
        onChangeArea={setAreaFilter}
      />

      <main className="max-w-5xl mx-auto px-4 py-6">
          {/* Filter Tabs (取引形態） */}
        <section className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'all', label: 'すべて' },
              { id: 'rent', label: 'レンタル' },
              { id: 'sale', label: '売買' },
            ].map((tab) => (
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'サイズ', value: selectedMachine.size || '-' },
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
                    <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                      {item.label}
                    </p>
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
              {/* タイトル（必須） */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  タイトル
                  <span className="ml-1 text-red-500 align-middle">*</span>
                </label>
                <input
                  type="text"
                  placeholder="コベルコ 0.45m3 油圧ショベル"
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                />
              </div>

              {/* 写真（必須・最大5枚） */}
                <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  写真（最大5枚・スマホ/PCからアップロード）
                  <span className="ml-1 text-red-500 align-middle">*</span>
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
              <div className="flex items-center gap-3 border-t border-b border-slate-200 py-3 mt-2">
                <label className="flex items-center gap-1 text-xs font-bold text-slate-500 whitespace-nowrap">
                  <span>都道府県</span>
                  <span className="text-red-500 align-middle">*</span>
                </label>
                <select
                  className="flex-1 bg-transparent border-none text-right text-sm text-slate-900 focus:outline-none focus:ring-0"
                  value={postPrefecture}
                  onChange={(e) => setPostPrefecture(e.target.value)}
                >
                  <option value="">選択してください</option>
                  <option value="北海道">北海道</option>
                  <option value="青森県">青森県</option>
                  <option value="岩手県">岩手県</option>
                  <option value="宮城県">宮城県</option>
                  <option value="秋田県">秋田県</option>
                  <option value="山形県">山形県</option>
                  <option value="福島県">福島県</option>
                  <option value="茨城県">茨城県</option>
                  <option value="栃木県">栃木県</option>
                  <option value="群馬県">群馬県</option>
                  <option value="埼玉県">埼玉県</option>
                  <option value="千葉県">千葉県</option>
                  <option value="東京都">東京都</option>
                  <option value="神奈川県">神奈川県</option>
                  <option value="新潟県">新潟県</option>
                  <option value="富山県">富山県</option>
                  <option value="石川県">石川県</option>
                  <option value="福井県">福井県</option>
                  <option value="山梨県">山梨県</option>
                  <option value="長野県">長野県</option>
                  <option value="岐阜県">岐阜県</option>
                  <option value="静岡県">静岡県</option>
                  <option value="愛知県">愛知県</option>
                  <option value="三重県">三重県</option>
                  <option value="滋賀県">滋賀県</option>
                  <option value="京都府">京都府</option>
                  <option value="大阪府">大阪府</option>
                  <option value="兵庫県">兵庫県</option>
                  <option value="奈良県">奈良県</option>
                  <option value="和歌山県">和歌山県</option>
                  <option value="鳥取県">鳥取県</option>
                  <option value="島根県">島根県</option>
                  <option value="岡山県">岡山県</option>
                  <option value="広島県">広島県</option>
                  <option value="山口県">山口県</option>
                  <option value="徳島県">徳島県</option>
                  <option value="香川県">香川県</option>
                  <option value="愛媛県">愛媛県</option>
                  <option value="高知県">高知県</option>
                  <option value="福岡県">福岡県</option>
                  <option value="佐賀県">佐賀県</option>
                  <option value="長崎県">長崎県</option>
                  <option value="熊本県">熊本県</option>
                  <option value="大分県">大分県</option>
                  <option value="宮崎県">宮崎県</option>
                  <option value="鹿児島県">鹿児島県</option>
                  <option value="沖縄県">沖縄県</option>
                </select>
              </div>

              {/* 商材カテゴリー */}
              <div className="flex items-center gap-3 border-b border-slate-200 py-3">
                <label className="flex items-center gap-1 text-xs font-bold text-slate-500 whitespace-nowrap">
                  <span>商材カテゴリー</span>
                  <span className="text-red-500 align-middle">*</span>
                </label>
                <select
                  className="flex-1 bg-transparent border-none text-right text-sm text-slate-900 focus:outline-none focus:ring-0"
                  value={postCategory}
                  onChange={(e) => {
                    const next = e.target.value as 'HEAVY_MACHINERY' | 'DUMP' | 'ATTACHMENT';
                    setPostCategory(next);
                    setPostMaker('');
                    setPostMakerSelect('');
                  }}
                >
                  <option value="HEAVY_MACHINERY">重機</option>
                  <option value="DUMP">ダンプ</option>
                  <option value="ATTACHMENT">アタッチメント</option>
                </select>
              </div>

              {/* メーカー */}
              <div className="border-b border-slate-200 py-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-500 whitespace-nowrap">
                    <span>メーカー</span>
                    <span className="text-red-500 align-middle">*</span>
                  </label>
                  <select
                    className="flex-1 bg-transparent border-none text-right text-sm text-slate-900 focus:outline-none focus:ring-0"
                    value={postMakerSelect}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPostMakerSelect(value);
                      if (value === 'OTHER') {
                        setPostMaker('');
                      } else {
                        setPostMaker(value);
                      }
                    }}
                  >
                    <option value="">選択してください</option>
                    {makerOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                    <option value="OTHER">その他</option>
                  </select>
                </div>
                {postMakerSelect === 'OTHER' && (
                  <input
                    type="text"
                    placeholder="その他メーカー名を入力"
                    className="mt-2 w-full border border-slate-200 rounded-lg p-3 text-sm"
                    value={postMaker}
                    onChange={(e) => setPostMaker(e.target.value)}
                  />
                )}
                </div>

              {/* サイズ */}
              <div className="flex items-center gap-3 border-b border-slate-200 py-3">
                <label className="flex items-center gap-1 text-xs font-bold text-slate-500 whitespace-nowrap">
                  <span>サイズ</span>
                  <span className="text-red-500 align-middle">*</span>
                </label>
                <select
                  className="flex-1 bg-transparent border-none text-right text-sm text-slate-900 focus:outline-none focus:ring-0"
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
              <div className="flex items-center gap-3 border-b border-slate-200 py-3">
                <label className="flex items-center gap-1 text-xs font-bold text-slate-500 whitespace-nowrap">
                  <span>稼働時間（h）</span>
                  <span className="text-red-500 align-middle">*</span>
                </label>
                <div className="flex-1">
                  <select
                    className="w-full bg-transparent border-none text-right text-sm text-slate-900 focus:outline-none focus:ring-0"
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
                </div>
              </div>

              {/* 状態 */}
              <div className="flex items-center gap-3 border-b border-slate-200 py-3">
                <label className="flex items-center gap-1 text-xs font-bold text-slate-500 whitespace-nowrap">
                  <span>状態（1〜5）</span>
                  <span className="text-red-500 align-middle">*</span>
                </label>
                <select
                  className="flex-1 bg-transparent border-none text-right text-sm text-slate-900 focus:outline-none focus:ring-0"
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
                <textarea
                  placeholder="主な使用用途・現場規模・修理履歴など（自由記述）"
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm min-h-[100px]"
                  value={postUsageNote}
                  onChange={(e) => setPostUsageNote(e.target.value)}
                  />
                </div>

              {/* 区切り線（取引形態の直前） */}
              <div className="mt-6 mb-4 h-px bg-slate-200" />

              {/* 取引形態 */}
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-slate-500 mb-1">
                  <span>取引形態（複数選択可）</span>
                  <span className="text-red-500 align-middle">*</span>
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
                </div>
              </div>

              {/* レンタル条件 */}
              {postDealRental && (
                <div className="space-y-3">
                  {/* レンタル金額（メイン） */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-500 whitespace-nowrap">
                      <span>レンタル金額（税込）</span>
                      <span className="text-red-500 align-middle">*</span>
                    </label>
                    <div className="flex flex-1 gap-2">
                    <input
                        type="text"
                        inputMode="numeric"
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                        placeholder="例：18,000"
                        value={postRentalPrice}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d]/g, '');
                          const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                          setPostRentalPrice(formatted);
                        }}
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

                  {/* レンタルの補足条件（サブ） */}
                  <div className="space-y-2 pl-2">
                    <div className="rounded-lg bg-slate-50 px-3 py-3">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        - 最低レンタル期間（任意）
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

                    <div className="rounded-lg bg-slate-50 px-3 py-3">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        - 利用可能開始日（任意）
                      </label>
                      <input
                        type="date"
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                        value={postAvailableFrom}
                        onChange={(e) => setPostAvailableFrom(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 売買条件 */}
              {postDealSale && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-500 whitespace-nowrap">
                    <span>売買参考価格（税込）</span>
                    <span className="text-red-500 align-middle">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="flex-1 border border-slate-200 rounded-lg p-3 text-sm"
                    placeholder="例：8,500,000"
                    value={postSalePrice}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, '');
                      const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                      setPostSalePrice(formatted);
                    }}
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
    </div>
  );
}


