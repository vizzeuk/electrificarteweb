export interface CalcVersion {
  _key:                 string;
  name:                 string;
  price:                number;
  discountPrice?:       number | null;
  batteryCapacity?:     number | null;
  range?:               number | null;
  electricRangeKm?:     number | null;
  fuelConsumption?:     number | null;
  rendimientoElectrico?: number | null;
}

export interface CalcCar {
  _id:                  string;
  name:                 string;
  slug:                 string;
  brand:                string;
  brandSlug:            string;
  imageUrl?:            string;
  basePrice:            number;
  discountPrice:        number;
  range:                number;
  batteryCapacity:      number;
  electricTypeTag:      string;
  vehicleTypeSlug?:     string;
  electricRangeKm?:     number | null;
  fuelConsumption?:     number | null;
  rendimientoElectrico?: number | null;
  brandLogoUrl?:        string | null;
  versions?:            CalcVersion[];
}
