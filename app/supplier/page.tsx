'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Edit3, MapPin, Pause, Play, Trash2, PlusCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useMe } from '../../lib/useMe';
import { toggleMachineStatusAction } from './actions';

// サプライヤー用一覧カードで使うサムネイルのデフォルト画像
const SUPPLIER_DEFAULT_THUMBNAIL =
  'https://images.pexels.com/photos/6003651/pexels-photo-6003651.jpeg?auto=compress&cs=tinysrgb&w=1200';

type SupplierMachine = {
  id: string;
  title: string;
  category: string;
  maker: string | null;
  model: string | null;
  machine_class: string | null;
  operating_hours: number | null;
  condition: number | null;
  status: 'PUBLISHED' | 'STOPPED' | string;
  rental_enabled: boolean;
  sale_enabled: boolean;
  rental_price_daily: number | null;
  rental_price_unit: string | null;
  rental_min_period: number | null;
  rental_min_unit: string | null;
  sale_price: number | null;
  location_prefecture: string | null;
  location_city: string | null;
  available_from: string | null;
  usage_type: string | null;
  site_scale: string | null;
  history: string | null;
  main_image_url: string | null;
  image_urls: string[] | null;
  created_at: string;
};

type PostImage = {
  file: File;
  previewUrl: string;
};

type EditState = {
  id: string;
  title: string;
  category: 'HEAVY_MACHINERY' | 'DUMP' | 'ATTACHMENT';
  maker: string;
  makerSelect: string;
  model: string;
  size: string;
  hours: string;
  condition: '1' | '2' | '3' | '4' | '5' | '';
  rentalEnabled: boolean;
  saleEnabled: boolean;
  rentalPrice: string;
  rentalUnit: 'DAY' | 'MONTH';
  rentalMinPeriod: string;
  rentalMinUnit: 'DAY' | 'MONTH';
  salePrice: string;
  prefecture: string;
  availableFrom: string;
  usageType: string;
  siteScale: string;
  history: string;
  status: 'PUBLISHED' | 'STOPPED';
  existingImageUrls: string[]; // 既存の画像URL（削除可能）
  newImages: PostImage[]; // 新規追加する画像ファイル
} | null;

const EDIT_MAKER_OPTIONS_BY_CATEGORY: Record<
  'HEAVY_MACHINERY' | 'ATTACHMENT' | 'DUMP',
  string[]
> = {
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

export default function SupplierDashboardPage() {
  const router = useRouter();
  const { me, isLoading: meLoading } = useMe();

  const [machines, setMachines] = useState<SupplierMachine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadMachines = useCallback(
    async (companyId: string, options?: { withLoading?: boolean }) => {
      const withLoading = options?.withLoading ?? true;

      if (withLoading) {
        setLoading(true);
      }
      setError(null);

      const { data, error } = await supabase
        .from('machines')
        .select(
          'id, title, category, maker, model, machine_class, operating_hours, condition, status, rental_enabled, sale_enabled, rental_price_daily, rental_price_unit, rental_min_period, rental_min_unit, sale_price, location_prefecture, location_city, available_from, usage_type, site_scale, history, main_image_url, image_urls, created_at',
        )
        .eq('owner_company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setMachines((data ?? []) as SupplierMachine[]);
      }

      if (withLoading) {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (meLoading) return;
    if (!me || !me.company) {
      router.replace('/auth');
      return;
    }
    void loadMachines(me.company.id);
  }, [meLoading, me, router, loadMachines]);

  const formatNumberWithCommas = (value: number | null): string => {
    if (value == null) return '';
    return value.toLocaleString('ja-JP');
  };

  const openEdit = (m: SupplierMachine) => {
    // 既存画像URLを取得（image_urlsがあればそれを使用、なければmain_image_urlを使用）
    const existingUrls =
      m.image_urls && m.image_urls.length > 0
        ? m.image_urls
        : m.main_image_url
        ? [m.main_image_url]
        : [];

    const category = (m.category as 'HEAVY_MACHINERY' | 'DUMP' | 'ATTACHMENT') ?? 'HEAVY_MACHINERY';
    const makerOptions = EDIT_MAKER_OPTIONS_BY_CATEGORY[category];
    const currentMaker = m.maker ?? '';
    const makerSelect = currentMaker
      ? makerOptions.includes(currentMaker)
        ? currentMaker
        : 'OTHER'
      : '';

    setEditState({
      id: m.id,
      title: m.title,
      category,
      maker: m.maker ?? '',
      makerSelect,
      model: m.model ?? '',
      size: m.machine_class ?? '',
      hours: m.operating_hours?.toString() ?? '',
      condition: (m.condition?.toString() as '1' | '2' | '3' | '4' | '5' | '') ?? '',
      rentalEnabled: m.rental_enabled ?? false,
      saleEnabled: m.sale_enabled ?? false,
      rentalPrice: formatNumberWithCommas(m.rental_price_daily),
      rentalUnit: (m.rental_price_unit as 'DAY' | 'MONTH') ?? 'DAY',
      rentalMinPeriod: m.rental_min_period?.toString() ?? '',
      rentalMinUnit: (m.rental_min_unit as 'DAY' | 'MONTH') ?? 'DAY',
      salePrice: formatNumberWithCommas(m.sale_price),
      prefecture: m.location_prefecture ?? '',
      availableFrom: m.available_from ?? '',
      usageType: m.usage_type ?? '',
      siteScale: m.site_scale ?? '',
      history: m.history ?? '',
      status: (m.status as 'PUBLISHED' | 'STOPPED') ?? 'PUBLISHED',
      existingImageUrls: existingUrls,
      newImages: [],
    });
    setError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editState || !me?.company) return;
    setSavingEdit(true);
    setError(null);

    const normalizeNumber = (v: string) => {
      const digits = v.replace(/,/g, '').trim();
      return digits ? Number(digits) : null;
    };

    const rental = normalizeNumber(editState.rentalPrice);
    const sale = normalizeNumber(editState.salePrice);
    const hours = editState.hours.trim() ? Number(editState.hours) : null;
    const condition = editState.condition ? Number(editState.condition) : null;
    const minPeriod = editState.rentalMinPeriod.trim() ? Number(editState.rentalMinPeriod) : null;
    const availableFrom = editState.availableFrom.trim() || null;

    // 画像アップロード（新規追加分のみ）
    let newImageUrls: string[] = [];
    if (editState.newImages.length > 0) {
      try {
        const bucket = supabase.storage.from('machine-images');
        for (let i = 0; i < editState.newImages.length; i += 1) {
          const file = editState.newImages[i].file;
          const ext = file.name.split('.').pop() || 'jpg';
          const path = `${me.company.id}/${Date.now()}_${i}.${ext}`;
          const { error: uploadError } = await bucket.upload(path, file, {
            upsert: true,
          });
          if (uploadError) {
            throw uploadError;
          }
          const { data: publicUrlData } = bucket.getPublicUrl(path);
          newImageUrls.push(publicUrlData.publicUrl);
        }
      } catch (err: any) {
        const msg: string | undefined = err?.message ?? err?.error_description;
        if (msg && /bucket not found/i.test(msg)) {
          setError(
            '画像保存用の Storage バケット「machine-images」が見つかりません。Supabase の Storage で「machine-images」という公開バケットを作成してください。',
          );
        } else if (msg && /row-level security/i.test(msg)) {
          setError(
            'Storage の RLS 設定で画像のアップロードがブロックされています。「machine-images」バケットへの INSERT を許可するポリシーを追加してください。',
          );
        } else {
          setError(msg ?? '画像のアップロードに失敗しました。');
        }
        setSavingEdit(false);
        return;
      }
    }

    // 既存画像URL + 新規画像URLを結合（最大5枚まで）
    const allImageUrls = [...editState.existingImageUrls, ...newImageUrls].slice(0, 5);
    const mainImageUrl = allImageUrls[0] || null;

    const { error } = await supabase
      .from('machines')
      .update({
        title: editState.title,
        category: editState.category,
        maker: editState.maker || null,
        model: editState.model || null,
        machine_class: editState.size || null,
        operating_hours: hours,
        condition,
        rental_enabled: editState.rentalEnabled,
        sale_enabled: editState.saleEnabled,
        rental_price_daily: rental,
        rental_price_unit: editState.rentalUnit,
        rental_min_period: minPeriod,
        rental_min_unit: editState.rentalMinUnit,
        sale_price: sale,
        location_prefecture: editState.prefecture || null,
        available_from: availableFrom,
        usage_type: editState.usageType || null,
        site_scale: editState.siteScale || null,
        history: editState.history || null,
        main_image_url: mainImageUrl,
        image_urls: allImageUrls.length > 0 ? allImageUrls : null,
        status: editState.status,
      })
      .eq('id', editState.id);

    if (error) {
      setError(error.message);
    } else {
      await loadMachines(me.company.id);
      setEditState(null);
    }

    setSavingEdit(false);
  };

  const handleClickImageUpload = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const handleChangeEditImages: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const files = event.target.files;
    if (!files || !editState) return;

    const existingCount = editState.existingImageUrls.length + editState.newImages.length;
    const incoming = Array.from(files);

    if (existingCount >= 5) {
      setError('画像は最大5枚までアップロードできます。');
      event.target.value = '';
      return;
    }

    const remainingSlots = 5 - existingCount;
    const allowedFiles = incoming.slice(0, remainingSlots);

    const validFiles: File[] = [];
    for (const f of allowedFiles) {
      if (!f.type.startsWith('image/')) {
        setError('画像ファイルのみアップロードできます。');
        continue;
      }
      validFiles.push(f);
    }

    const newImages: PostImage[] = validFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setEditState((prev) => (prev ? { ...prev, newImages: [...prev.newImages, ...newImages] } : null));
    event.target.value = '';
  };

  const handleRemoveExistingImage = (index: number) => {
    if (!editState) return;
    setEditState({
      ...editState,
      existingImageUrls: editState.existingImageUrls.filter((_, i) => i !== index),
    });
  };

  const handleRemoveNewImage = (index: number) => {
    if (!editState) return;
    setEditState({
      ...editState,
      newImages: editState.newImages.filter((_, i) => i !== index),
    });
  };

  const handleToggleStatus = async (m: SupplierMachine) => {
    if (!me?.company?.id) return;

    setError(null);
    setTogglingId(m.id);

    const result = await toggleMachineStatusAction({
      machineId: m.id,
      ownerCompanyId: me.company.id,
      currentStatus: (m.status as 'PUBLISHED' | 'STOPPED') ?? 'PUBLISHED',
    });

    if (!result.ok) {
      setError(result.error);
      setTogglingId(null);
      return;
    }

    // 楽観的にローカル状態も更新して、ボタン表示をすぐ切り替える
    setMachines((prev) =>
      prev.map((machine) =>
        machine.id === m.id ? { ...machine, status: result.nextStatus } : machine,
      ),
    );

    await loadMachines(me.company.id, { withLoading: false });
    setTogglingId(null);
  };

  const handleDelete = async (m: SupplierMachine) => {
    if (!me?.company?.id) return;
    const ok = window.confirm(`本当にこの出品を削除しますか？\n\n${m.title}`);
    if (!ok) return;
    const { error } = await supabase.from('machines').delete().eq('id', m.id);
    if (error) {
      setError(error.message);
    } else {
      await loadMachines(me.company.id, { withLoading: false });
    }
  };

  const locationText = (m: SupplierMachine) => m.location_prefecture || '';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 text-white p-1.5 rounded-lg font-black tracking-tighter">
            K-M
          </div>
          <h1 className="text-lg font-bold tracking-tight hidden sm:block">出品管理</h1>
        </div>
        <Link href="/" className="text-sm font-bold text-slate-700 hover:text-slate-900">
          トップへ戻る
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-black">自社の出品一覧</h2>
          </div>
          <Link
            href="/"
            className="hidden md:inline-flex items-center gap-1.5 text-sm font-bold bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-800"
          >
            戻る
          </Link>
        </div>

        {/* ローディング文言は表示しない（静かにカードだけ更新） */}
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
            {error}
          </div>
        )}

        {!loading && machines.length === 0 && (
          <p className="text-sm text-slate-500">まだ出品がありません。「出品する」から登録してください。</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {machines.map((m) => {
            const thumbnail =
              m.main_image_url ||
              (m.image_urls && m.image_urls.length > 0
                ? m.image_urls[0]
                : SUPPLIER_DEFAULT_THUMBNAIL);
            const rentalLabel =
              m.rental_price_unit === 'MONTH' ? 'レンタル月額' : 'レンタル日額';

            return (
              <div
                key={m.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow h-[420px]"
              >
                <div className="relative h-[240px] bg-slate-100">
                  <img
                    src={thumbnail}
                    alt={m.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 p-3 flex flex-col overflow-hidden">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">
                          {new Date(m.created_at).toLocaleString('ja-JP')}
                        </p>
                        <h3 className="font-bold text-slate-900 text-base line-clamp-1">
                          {m.title}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 line-clamp-1">
                          <MapPin size={11} />
                          {locationText(m) || '所在地未設定'}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                          m.status === 'PUBLISHED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {m.status === 'PUBLISHED' ? '掲載中' : '停止中'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                      <div>
                        <p className="text-xs text-slate-400 font-bold mb-0.5">
                          {rentalLabel}
                        </p>
                        <p className="font-bold whitespace-nowrap">
                          {m.rental_price_daily != null
                            ? `¥${m.rental_price_daily.toLocaleString()}`
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-bold mb-0.5">売買参考価格</p>
                        <p className="font-bold whitespace-nowrap">
                          {m.sale_price != null ? `¥${m.sale_price.toLocaleString()}` : '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto pt-2">
                    <button
                      type="button"
                      onClick={() => openEdit(m)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-50"
                    >
                      <Edit3 size={14} />
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(m)}
                      disabled={togglingId === m.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-50 disabled:opacity-60"
                    >
                      {togglingId === m.id ? (
                        <>
                          <Pause size={14} />
                          処理中…
                        </>
                      ) : m.status === 'PUBLISHED' ? (
                        <>
                          <Pause size={14} />
                          掲載を停止
                        </>
                      ) : (
                        <>
                          <Play size={14} />
                          掲載を再開
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m)}
                      className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {editState && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setEditState(null)}
            />
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="mb-4 text-lg font-bold text-slate-900">出品内容の編集</h3>
              <form className="space-y-4" onSubmit={handleSaveEdit}>
                {/* タイトル（必須） */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">タイトル</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 p-3 text-sm"
                    placeholder="コベルコ 0.45m3 油圧ショベル"
                    value={editState.title}
                    onChange={(e) =>
                      setEditState((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                    }
                  />
                </div>

                {/* 写真（最大5枚） */}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">
                    写真（最大5枚・スマホ/PCからアップロード）
                  </label>
                  {editState.existingImageUrls.length === 0 && editState.newImages.length === 0 ? (
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
                      {/* 既存画像 */}
                      {editState.existingImageUrls.map((url, index) => (
                        <div
                          key={`existing-${index}`}
                          className="relative h-16 w-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200"
                        >
                          <img src={url} alt={`existing-${index}`} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(index)}
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-black/70 text-white text-[10px] flex items-center justify-center hover:bg-black"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {/* 新規追加画像 */}
                      {editState.newImages.map((img, index) => (
                        <div
                          key={`new-${index}`}
                          className="relative h-16 w-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200"
                        >
                          <img
                            src={img.previewUrl}
                            alt={`new-${index}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewImage(index)}
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-black/70 text-white text-[10px] flex items-center justify-center hover:bg-black"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {/* 追加ボタン */}
                      {editState.existingImageUrls.length + editState.newImages.length < 5 && (
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
                    onChange={handleChangeEditImages}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    スマホ・PC から最大5枚までアップロードできます。
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
                    value={editState.prefecture}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev ? { ...prev, prefecture: e.target.value } : prev,
                      )
                    }
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
                    value={editState.category}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev
                          ? {
                              ...prev,
                              category: e.target.value as 'HEAVY_MACHINERY' | 'DUMP' | 'ATTACHMENT',
                            }
                          : prev,
                      )
                    }
                  >
                    <option value="HEAVY_MACHINERY">重機</option>
                    <option value="DUMP">ダンプ</option>
                    <option value="ATTACHMENT">アタッチメント</option>
                  </select>
                </div>
                {/* メーカー（カテゴリに応じたプルダウン） */}
                <div className="border-b border-slate-200 py-3">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-500 whitespace-nowrap">
                      <span>メーカー</span>
                      <span className="text-red-500 align-middle">*</span>
                    </label>
                    <select
                      className="flex-1 bg-transparent border-none text-right text-sm text-slate-900 focus:outline-none focus:ring-0"
                      value={editState.makerSelect}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditState((prev) =>
                          prev
                            ? {
                                ...prev,
                                makerSelect: value,
                                maker: value === 'OTHER' ? prev.maker : value,
                              }
                            : prev,
                        );
                      }}
                    >
                      <option value="">選択してください</option>
                      {EDIT_MAKER_OPTIONS_BY_CATEGORY[editState.category].map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                      <option value="OTHER">その他</option>
                    </select>
                  </div>
                  {editState.makerSelect === 'OTHER' && (
                    <input
                      type="text"
                      placeholder="その他メーカー名を入力"
                      className="mt-2 w-full border border-slate-200 rounded-lg p-3 text-sm"
                      value={editState.maker}
                      onChange={(e) =>
                        setEditState((prev) => (prev ? { ...prev, maker: e.target.value } : prev))
                      }
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
                    value={editState.size}
                    onChange={(e) =>
                      setEditState((prev) => (prev ? { ...prev, size: e.target.value } : prev))
                    }
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
                  <select
                    className="flex-1 bg-transparent border-none text-right text-sm text-slate-900 focus:outline-none focus:ring-0"
                    value={editState.hours}
                    onChange={(e) =>
                      setEditState((prev) => (prev ? { ...prev, hours: e.target.value } : prev))
                    }
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

                {/* 状態 */}
                <div className="flex items-center gap-3 border-b border-slate-200 py-3">
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-500 whitespace-nowrap">
                    <span>状態（1〜5）</span>
                    <span className="text-red-500 align-middle">*</span>
                  </label>
                  <select
                    className="flex-1 bg-transparent border-none text-right text-sm text-slate-900 focus:outline-none focus:ring-0"
                    value={editState.condition}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev
                          ? { ...prev, condition: e.target.value as '1' | '2' | '3' | '4' | '5' | '' }
                          : prev,
                      )
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
                <div className="border-b border-slate-200 py-3">
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    使用用途・現場情報（任意）
                  </label>
                  <textarea
                    placeholder="主な使用用途・現場規模・修理履歴など（自由記述）"
                    className="w-full rounded-lg border border-slate-200 p-3 text-sm min-h-[100px]"
                    value={editState.history}
                    onChange={(e) =>
                      setEditState((prev) => (prev ? { ...prev, history: e.target.value } : prev))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">取引形態（複数選択可）</label>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={editState.rentalEnabled}
                        onChange={(e) =>
                          setEditState((prev) => (prev ? { ...prev, rentalEnabled: e.target.checked } : prev))
                        }
                      />
                      レンタル
                    </label>
                    <label className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={editState.saleEnabled}
                        onChange={(e) =>
                          setEditState((prev) => (prev ? { ...prev, saleEnabled: e.target.checked } : prev))
                        }
                      />
                      売買
                    </label>
                  </div>
                </div>
                {editState.rentalEnabled && (
                  <div className="space-y-3 border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <p className="text-xs font-bold text-slate-700 mb-2">レンタル条件</p>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-500">
                        レンタル金額（税込・必須）
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          className="flex-1 rounded-lg border border-slate-200 p-3 text-sm"
                          placeholder="例：18,000"
                          value={editState.rentalPrice}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^\d]/g, '');
                            const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                            setEditState((prev) => (prev ? { ...prev, rentalPrice: formatted } : prev));
                          }}
                        />
                        <select
                          className="w-24 border border-slate-200 rounded-lg p-2 text-xs"
                          value={editState.rentalUnit}
                          onChange={(e) =>
                            setEditState((prev) =>
                              prev ? { ...prev, rentalUnit: e.target.value as 'DAY' | 'MONTH' } : prev,
                            )
                          }
                        >
                          <option value="DAY">日額</option>
                          <option value="MONTH">月額</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-500">
                        最低レンタル期間（任意）
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          className="flex-1 rounded-lg border border-slate-200 p-3 text-sm"
                          placeholder="例：7"
                          value={editState.rentalMinPeriod}
                          onChange={(e) =>
                            setEditState((prev) => (prev ? { ...prev, rentalMinPeriod: e.target.value } : prev))
                          }
                        />
                        <select
                          className="w-24 border border-slate-200 rounded-lg p-2 text-xs"
                          value={editState.rentalMinUnit}
                          onChange={(e) =>
                            setEditState((prev) =>
                              prev ? { ...prev, rentalMinUnit: e.target.value as 'DAY' | 'MONTH' } : prev,
                            )
                          }
                        >
                          <option value="DAY">日</option>
                          <option value="MONTH">ヶ月</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-500">利用可能開始日（任意）</label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-slate-200 p-3 text-sm"
                        value={editState.availableFrom}
                        onChange={(e) =>
                          setEditState((prev) => (prev ? { ...prev, availableFrom: e.target.value } : prev))
                        }
                      />
                    </div>
                  </div>
                )}
                {editState.saleEnabled && (
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500">
                      売買参考価格（税込・必須）
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full rounded-lg border border-slate-200 p-3 text-sm"
                      placeholder="例：8,500,000"
                      value={editState.salePrice}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, '');
                        const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                        setEditState((prev) => (prev ? { ...prev, salePrice: formatted } : prev));
                      }}
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">掲載ステータス</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 p-3 text-sm"
                    value={editState.status}
                    onChange={(e) =>
                      setEditState((prev) =>
                        prev ? { ...prev, status: e.target.value as 'PUBLISHED' | 'STOPPED' } : prev,
                      )
                    }
                  >
                    <option value="PUBLISHED">掲載中</option>
                    <option value="STOPPED">停止中</option>
                  </select>
                </div>

                {error && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
                    {error}
                  </div>
                )}

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    onClick={() => setEditState(null)}
                    disabled={savingEdit}
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {savingEdit ? '保存中…' : '保存する'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


