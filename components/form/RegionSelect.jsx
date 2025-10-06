import { useMemo } from 'react';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
];
const CA_PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];

export default function RegionSelect({ country, value, onChange, required=false }){
  const isUS = country === 'United States';
  const isCA = country === 'Canada';
  const label = isUS ? 'State' : (isCA ? 'Province' : 'Province/State/Region');
  const list = useMemo(()=> isUS ? US_STATES : (isCA ? CA_PROVINCES : null), [isUS, isCA]);

  if (list) {
    return (
      <label className="block">
        <span className="text-sm text-gray-700">{label}{required && ' *'}</span>
        <select className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={value||''} onChange={e=>onChange && onChange(e.target.value)}>
          <option value="">Select...</option>
          {list.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
      </label>
    );
  }
  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}{required && ' *'}</span>
      <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={value||''} onChange={e=>onChange && onChange(e.target.value)} maxLength={100} />
    </label>
  );
}
