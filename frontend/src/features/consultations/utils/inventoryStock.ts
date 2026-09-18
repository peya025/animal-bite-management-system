import type { VaccineStockMap } from '../types/consultation.types';

export function calculateVaccineStockMap(items: any[]): VaccineStockMap {
  const map: VaccineStockMap = {};

  items.forEach((item) => {
    if (item.status !== 'active') return;
    const vType = item.vaccine_type;
    if (!vType) return;
    if (!map[vType]) {
      map[vType] = {
        total_stock: 0,
        doses_per_vial: 1,
        patient_capacity: 0,
        open_vials_count: 0,
        open_doses_used: 0,
        open_doses_remaining: 0,
      };
    }
    map[vType].total_stock += Number(item.current_quantity || 0);
    const dpv = Number(item.doses_per_vial || 1);
    if (dpv > map[vType].doses_per_vial) map[vType].doses_per_vial = dpv;
    if (item.open_vial_status === 'opened') {
      map[vType].open_vials_count += 1;
      map[vType].open_doses_used += Number(item.open_vial_doses_used || 0);
    }
  });

  Object.keys(map).forEach((type) => {
    const entry = map[type];
    const dpv = entry.doses_per_vial;
    const totalOpenDoses = entry.open_vials_count * dpv;
    const remaining = Math.max(0, totalOpenDoses - entry.open_doses_used);
    entry.open_doses_remaining = remaining;
    entry.patient_capacity = (entry.total_stock * dpv) + remaining;
    if (entry.open_vials_count > 0) {
      entry.open_fraction_used = `${entry.open_doses_used}/${dpv}`;
      entry.open_fraction_remaining = `${remaining}/${dpv}`;
    }
  });

  return map;
}
