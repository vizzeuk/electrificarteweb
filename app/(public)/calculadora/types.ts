export interface CalcVersion {
  _key:                 string;
  name:                 string;
  price:                number;
  discountPrice?:       number | null;
  /** Electrificación propia de la versión, solo si difiere de la del auto. */
  electricTypeTag?:     string | null;
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
