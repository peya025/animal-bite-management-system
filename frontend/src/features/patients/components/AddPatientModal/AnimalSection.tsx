import { SegmentedControl } from '../../../vaccinations/components/form3';
import type { EnrolmentFormData } from '../../types';

export default function AnimalSection({ data, onChange, disabled = false }: {
  data: Pick<EnrolmentFormData, 'animal_type' | 'animal_type_others' | 'animal_status' | 'animal_available' | 'animal_condition'>;
  onChange: (key: keyof EnrolmentFormData, value: string) => void;
  disabled?: boolean;
}) {
  const fields = [
    ['animal_type', 'Species', [['dog', 'Dog'], ['cat', 'Cat'], ['other', 'Other']]],
    ['animal_status', 'Ownership', [['owned', 'Owned'], ['stray', 'Stray'], ['unknown', 'Unknown']]],
    ['animal_available', 'Available for 14-day observation', [['yes', 'Yes'], ['no', 'No'], ['unknown', 'Unknown']]],
    ['animal_condition', 'Condition', [['healthy', 'Healthy'], ['sick', 'Sick'], ['died', 'Dead'], ['unknown', 'Unknown']]],
  ] as const;
  return <section style={{ margin: '24px 0' }} aria-label="Animal">
    <h3 style={{ fontSize: 15, marginBottom: 16 }}>Animal</h3>
    <div className="fm-grid fm-grid--2">
      {fields.map(([key, label, options]) => <div key={key}>
        <SegmentedControl label={label} value={data[key] || ''} disabled={disabled}
          options={options.map(([value, label]) => ({ value, label }))}
          onChange={value => onChange(key, value)} />
        {key === 'animal_type' && data.animal_type === 'other' && <input
          aria-label="Other species" placeholder="Specify other animal" value={data.animal_type_others || ''}
          disabled={disabled} onChange={event => onChange('animal_type_others', event.target.value)}
          style={{ marginTop: 8, padding: 10, font: 'inherit', border: '1px solid var(--border-color, #d1d5db)', borderRadius: 8 }} />}
      </div>)}
    </div>
  </section>;
}
