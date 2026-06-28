const COUNTRY_MAP: Record<string, string> = {
  audi: "Alemania", bmw: "Alemania", mercedes: "Alemania", volkswagen: "Alemania", skoda: "Alemania",
  byd: "China", changan: "China", chery: "China", deepal: "China", dfsk: "China",
  dongfeng: "China", gac: "China", geely: "China", gwm: "China", haval: "China",
  jac: "China", jaecoo: "China", jetour: "China", jmc: "China", leapmotor: "China",
  lynk: "China", maxus: "China", mg: "China", nammi: "China", omoda: "China",
  ora: "China", riddara: "China", smart: "China",
  hyundai: "Corea del Sur", kia: "Corea del Sur", ssangyong: "Corea del Sur",
  tesla: "Estados Unidos", chevrolet: "Estados Unidos", ford: "Estados Unidos", jeep: "Estados Unidos",
  toyota: "Japón", honda: "Japón", mazda: "Japón", nissan: "Japón", lexus: "Japón",
  subaru: "Japón", suzuki: "Japón",
  peugeot: "Francia", ds: "Francia", renault: "Francia",
  fiat: "Italia",
  volvo: "Suecia",
  cupra: "España",
  mini: "Reino Unido",
};

export function getBrandCountry(slug: string, country?: string): string {
  if (country) return country;
  const key = slug.replace(/-/g, "_").toLowerCase();
  return COUNTRY_MAP[key] ?? COUNTRY_MAP[slug.split("-")[0]] ?? "";
}
