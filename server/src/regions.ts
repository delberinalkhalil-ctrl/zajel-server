// World regions for "who should my pigeon fly to", and the pure filter that matches a recipient
// against the sender's choices. Age and gender are never shown to anyone; they are only used here,
// and gender only for people who chose to share it for matching.

export type Region = 'AF' | 'AS' | 'EU' | 'NA' | 'SA' | 'OC';
export const REGIONS: Region[] = ['AF', 'AS', 'EU', 'NA', 'SA', 'OC'];

const BY_REGION: Record<Region, string> = {
  AF: 'AO BF BI BJ BW CD CF CG CI CM DJ DZ EG EH ER ET GA GH GM GN GQ GW KE LR LS LY MA MG ML MR MW MZ NA NE NG RW SD SL SN SO SS SZ TD TG TN TZ UG ZA ZM ZW',
  AS: 'AE AF AM AZ BD BN BT CN CY GE ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MY NP OM PH PK PS QA SA SY TH TJ TL TM TR TW UZ VN YE',
  EU: 'AL AT BA BE BG BY CH CZ DE DK EE ES FI FR GB GR HR HU IE IS IT LT LU LV MD ME MK NL NO PL PT RO RS RU SE SI SK UA',
  NA: 'BS BZ CA CR CU DO GL GT HN HT JM MX NI PA PR SV TT US',
  SA: 'AR BO BR CL CO EC FK GY PE PY SR UY VE',
  OC: 'AU FJ NC NZ PG SB VU AQ TF',
};
const REGION_OF: Record<string, Region> = {};
for (const r of REGIONS) for (const c of BY_REGION[r].split(' ')) REGION_OF[c] = r;

export const regionOf = (country: string): Region | null => REGION_OF[country] ?? null;
export const isRegion = (v: unknown): v is Region => typeof v === 'string' && (REGIONS as string[]).includes(v);

export type Gender = 'm' | 'f';
export interface Want {
  country?: string | null;
  region?: Region | null;
  lang?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  gender?: Gender | null;
}

export interface Candidate {
  country: string;
  lang: string;
  birthYear?: number;
  gender?: string;
  genderMatch?: boolean;
}

/** True when the candidate fits every filter the sender set. Unknown values never match a set filter. */
export function matchesWant(c: Candidate, w: Want, year = new Date().getUTCFullYear()): boolean {
  if (w.country && c.country !== w.country) return false;
  if (w.region && regionOf(c.country) !== w.region) return false;
  if (w.lang && c.lang !== w.lang) return false;
  if (w.ageMin || w.ageMax) {
    if (!c.birthYear) return false;
    const age = year - c.birthYear;
    if (w.ageMin && age < w.ageMin) return false;
    if (w.ageMax && age > w.ageMax) return false;
  }
  if (w.gender) {
    if (!c.genderMatch || c.gender !== w.gender) return false;
  }
  return true;
}

/** Cleans what the app sent; anything invalid is dropped rather than rejected. */
export function readWant(d: Record<string, unknown> | undefined, isLang: (v: unknown) => boolean): Want {
  const w: Want = {};
  if (!d) return w;
  if (typeof d.region === 'string' && isRegion(d.region)) w.region = d.region;
  if (isLang(d.lang)) w.lang = d.lang as string;
  const min = Math.round(Number(d.ageMin)), max = Math.round(Number(d.ageMax));
  if (Number.isFinite(min) && min >= 18 && min <= 100) w.ageMin = min;
  if (Number.isFinite(max) && max >= 18 && max <= 100) w.ageMax = max;
  if (w.ageMin && w.ageMax && w.ageMin > w.ageMax) [w.ageMin, w.ageMax] = [w.ageMax, w.ageMin];
  if (d.gender === 'm' || d.gender === 'f') w.gender = d.gender;
  return w;
}

export const hasWant = (w: Want) => !!(w.region || w.lang || w.ageMin || w.ageMax || w.gender);
