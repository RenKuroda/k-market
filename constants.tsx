
import { Machine, User } from './types';

export const MOCK_USER: User = {
  id: 'user-1',
  companyName: '株式会社 山田解体',
  companyType: 'DEMOLITION',
  region: '埼玉県',
  experienceYears: 25,
  isLoggedIn: false,
  avatar: 'https://picsum.photos/seed/user1/100/100'
};

export const MOCK_MACHINES: Machine[] = [
  {
    id: 'm1',
    category: 'HEAVY_MACHINERY',
    name: '油圧ショベル 0.45',
    manufacturer: 'コマツ',
    model: 'PC128US-11',
    size: '0.45m3',
    location: '千葉県',
    thumbnail: 'https://picsum.photos/seed/pc128/400/300',
    images: ['https://picsum.photos/seed/pc128-1/800/600', 'https://picsum.photos/seed/pc128-2/800/600'],
    dealTypes: ['RENTAL', 'SALE', 'RENT_TO_BUY'],
    priceRental: 18000,
    priceSale: 8500000,
    yearOfManufacture: 2019,
    operatingHours: 4200,
    purchaseDate: '2019-05',
    usageType: '木造解体・RC解体',
    siteScale: '一般住宅・3階建てビル',
    history: '定期メンテナンス済み。2022年にバケットシリンダーOH。',
    condition: 4,
    sellerId: 'seller-1',
    rentHistoryCount: 12,
    minRentPeriod: '1週間から'
  },
  {
    id: 'm2',
    category: 'DUMP',
    name: '4tダンプ（強化型）',
    manufacturer: 'いすゞ',
    model: 'フォワード',
    size: '4t',
    location: '東京都',
    thumbnail: 'https://picsum.photos/seed/dump4t/400/300',
    images: ['https://picsum.photos/seed/dump4t-1/800/600'],
    dealTypes: ['RENTAL'],
    priceRental: 12000,
    yearOfManufacture: 2021,
    operatingHours: 25000, // km in case of trucks
    usageType: '産廃運搬',
    condition: 5,
    sellerId: 'seller-2',
    rentHistoryCount: 5,
    minRentPeriod: '1ヶ月から'
  },
  {
    id: 'm3',
    category: 'ATTACHMENT',
    name: '大割クラッシャー',
    manufacturer: 'オカダアイヨン',
    model: 'OSC-210V',
    size: '0.7用',
    location: '神奈川県',
    thumbnail: 'https://picsum.photos/seed/crusher/400/300',
    images: ['https://picsum.photos/seed/crusher-1/800/600'],
    dealTypes: ['SALE'],
    priceSale: 2400000,
    yearOfManufacture: 2015,
    usageType: 'RC解体',
    condition: 3,
    sellerId: 'seller-3',
    rentHistoryCount: 0
  }
];
