
export type MachineCategory = 'HEAVY_MACHINERY' | 'DUMP' | 'ATTACHMENT';

export type DealType = 'RENTAL' | 'SALE' | 'RENT_TO_BUY';

export interface Machine {
  id: string;
  category: MachineCategory;
  name: string;
  manufacturer: string;
  model: string;
  size: string; // e.g., "0.45m3", "4t", "小割"
  location: string;
  thumbnail: string;
  images: string[];
  dealTypes: DealType[];
  rentalUnit?: 'DAY' | 'MONTH'; // レンタル金額の単位（MVPは日額/月額）
  
  // Private fields (Login required)
  priceRental?: number; // Daily
  priceSale?: number;
  yearOfManufacture?: number;
  operatingHours?: number;
  purchaseDate?: string;
  usageType?: string; // 解体, 造成, etc.
  siteScale?: string; // 住宅, ビル, etc.
  history?: string; // 修理・故障履歴
  condition: 1 | 2 | 3 | 4 | 5;
  sellerId: string;
  rentHistoryCount: number;
  minRentPeriod?: string;
  availableFrom?: string | null;
}

export interface User {
  id: string;
  companyName: string;
  companyType: 'DEMOLITION' | 'WASTE' | 'CONSTRUCTION';
  region: string;
  experienceYears: number;
  isLoggedIn: boolean;
  avatar?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  image?: string;
}

export interface ChatRoom {
  id: string;
  machineId: string;
  participantIds: string[];
  messages: Message[];
}
