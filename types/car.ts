export interface CarVersion {
  name: string;
  price: number;
  discountPrice?: number;
  batteryCapacity: number;
  range: number;
  power: number;
  torque?: number;
  acceleration?: number;
  topSpeed?: number;
  traction: "FWD" | "RWD" | "AWD";
  seats?: number;
  seatRows?: number;
  trunkCapacity?: number;
  chargeTimeDC?: string;
  chargeTimeAC?: string;
}

export interface Car {
  _id: string;
  _type: "car";
  slug: string;
  name: string;
  brand: Brand;
  category: Category;
  tagline?: string;
  description?: string;
  mainImage: SanityImage;
  gallery?: SanityImage[];
  versions: CarVersion[];
  basePrice: number;
  discountPrice?: number;
  batteryCapacity: number;
  range: number;
  power: number;
  traction: "FWD" | "RWD" | "AWD";
  isNew?: boolean;
  isFeatured?: boolean;
  isHotDeal?: boolean;
  hotDealBonusAmount?: number;
  hotDealExpiry?: string;
  safetyFeatures?: string[];
  techFeatures?: string[];
  metaTitle?: string;
  metaDescription?: string;
}

export interface Brand {
  _id: string;
  _type: "brand";
  name: string;
  slug: string;
  logo?: SanityImage;
  description?: string;
  country?: string;
}

export interface Category {
  _id: string;
  _type: "category";
  name: string;
  slug: string;
  description?: string;
}

export interface SanityImage {
  _type: "image";
  asset: {
    _ref: string;
    _type: "reference";
  };
  alt?: string;
}

export interface LeadFormData {
  fullName: string;
  email: string;
  phone: string;
  budget: string;
  brandInterest: string;
  modelInterest: string;
  message?: string;
  carSlug?: string;
}
