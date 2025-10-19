import { useState, useEffect } from 'react';
import Spinner from '../dashboard/Spinner';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AdminSettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
    fetchLocations();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/app-settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/admin/settings/locations');
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations);
        if (data.locations.length > 0) {
          setSelectedLocation(data.locations[0]);
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const updateSetting = async (key, value, type = 'string') => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings/app-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting_key: key, setting_value: value, setting_type: type })
      });
      const data = await res.json();
      if (data.success) {
        setSettings(prev => ({ ...prev, [key]: { ...prev?.[key], value } }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateBusinessHours = async (locationId, hours) => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings/locations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: locationId, business_hours: hours })
      });
      const data = await res.json();
      if (data.success) {
        fetchLocations();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
            activeTab === 'general'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          General Settings
        </button>
        <button
          onClick={() => setActiveTab('hours')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
            activeTab === 'hours'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Business Hours
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
            activeTab === 'holidays'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Holidays
        </button>
      </div>

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <GeneralSettingsTab settings={settings} updateSetting={updateSetting} saving={saving} />
      )}

      {/* Business Hours Tab */}
      {activeTab === 'hours' && (
        <BusinessHoursManager locations={locations} onUpdate={updateBusinessHours} saving={saving} />
      )}

      {/* Holidays Tab */}
      {activeTab === 'holidays' && <HolidaysManager locations={locations} />}
    </div>
  );
}

function GeneralSettingsTab({ settings, updateSetting, saving }) {
  const [logoPreview, setLogoPreview] = useState(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result;
        setLogoPreview(dataUrl);
        updateSetting('logo_url', dataUrl, 'file_url');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg border border-gray-200">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {(logoPreview || settings?.logo_url?.value) && (
          <div className="mt-3">
            <img src={logoPreview || settings?.logo_url?.value} alt="Logo" className="h-16 object-contain" />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
        <input
          type="text"
          defaultValue={settings?.company_name?.value || ''}
          onBlur={(e) => updateSetting('company_name', e.target.value, 'string')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
        <input
          type="email"
          defaultValue={settings?.support_email?.value || ''}
          onBlur={(e) => updateSetting('support_email', e.target.value, 'string')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Support Phone</label>
        <input
          type="tel"
          defaultValue={settings?.support_phone?.value || ''}
          onBlur={(e) => updateSetting('support_phone', e.target.value, 'string')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Default Turnaround Time</label>
        <input
          type="text"
          defaultValue={settings?.default_turnaround_time?.value || ''}
          onBlur={(e) => updateSetting('default_turnaround_time', e.target.value, 'string')}
          placeholder="e.g., 3-5 business days"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Quote Expiry (days)</label>
        <input
          type="number"
          defaultValue={settings?.quote_expiry_days?.value || 30}
          onBlur={(e) => updateSetting('quote_expiry_days', e.target.value, 'number')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Magic Link Expiry (days)</label>
        <input
          type="number"
          defaultValue={settings?.magic_link_expiry_days?.value || 30}
          onBlur={(e) => updateSetting('magic_link_expiry_days', e.target.value, 'number')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

function BusinessHoursManager({ locations, onUpdate, saving }) {
  const [location, setLocation] = useState(locations?.[0]);
  const [hours, setHours] = useState(location?.businessHours || []);

  useEffect(() => {
    if (location?.businessHours) {
      setHours([...location.businessHours]);
    }
  }, [location]);

  const updateHour = (dayOfWeek, field, value) => {
    setHours(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(h => h.day_of_week === dayOfWeek);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], [field]: value };
      }
      return updated;
    });
  };

  const handleSave = () => {
    if (location) {
      onUpdate(location.id, hours);
    }
  };

  if (!locations || locations.length === 0) {
    return <div className="text-gray-500">No locations found</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Location</label>
        <select
          value={location?.id || ''}
          onChange={(e) => setLocation(locations.find(l => l.id === e.target.value))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {locations.map(l => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {DAYS_OF_WEEK.map((day, dayIdx) => {
          const dayHours = hours.find(h => h.day_of_week === dayIdx);
          return (
            <div key={dayIdx} className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-b-0">
              <div className="w-24 font-medium text-sm text-gray-700">{day}</div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={dayHours?.is_closed || false}
                  onChange={(e) => updateHour(dayIdx, 'is_closed', e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span>Closed</span>
              </label>
              {!dayHours?.is_closed && (
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={dayHours?.opening_time || '09:00'}
                    onChange={(e) => updateHour(dayIdx, 'opening_time', e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={dayHours?.closing_time || '17:00'}
                    onChange={(e) => updateHour(dayIdx, 'closing_time', e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
      >
        {saving ? 'Saving...' : 'Save Business Hours'}
      </button>
    </div>
  );
}

function HolidaysManager({ locations }) {
  const [holidays, setHolidays] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(locations?.[0]?.id);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedLocation) {
      fetchHolidays();
    }
  }, [selectedLocation]);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/settings/holidays?location_id=${selectedLocation}`);
      const data = await res.json();
      if (data.success) {
        setHolidays(data.holidays);
      }
    } catch (err) {
      console.error('Failed to fetch holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Location</label>
        <select
          value={selectedLocation || ''}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {locations.map(l => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => setShowForm(!showForm)}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
      >
        {showForm ? 'Cancel' : 'Add Holiday'}
      </button>

      {showForm && <HolidayForm locationId={selectedLocation} onSave={() => { setShowForm(false); fetchHolidays(); }} />}

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-3">
          {holidays.length === 0 ? (
            <p className="text-gray-500 text-sm">No holidays scheduled</p>
          ) : (
            holidays.map(holiday => (
              <HolidayCard key={holiday.id} holiday={holiday} onDelete={() => fetchHolidays()} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function HolidayForm({ locationId, onSave }) {
  const [form, setForm] = useState({
    holiday_name: '',
    holiday_date: '',
    description: '',
    is_closed: true,
    opening_time: '09:00',
    closing_time: '17:00',
    is_recurring: false,
    recurring_month: 1,
    recurring_day: 1
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: locationId, ...form })
      });
      const data = await res.json();
      if (data.success) {
        onSave();
      }
    } catch (err) {
      console.error('Failed to create holiday:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-200">
      <input
        type="text"
        placeholder="Holiday Name"
        value={form.holiday_name}
        onChange={(e) => setForm(prev => ({ ...prev, holiday_name: e.target.value }))}
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        required
      />
      <input
        type="date"
        value={form.holiday_date}
        onChange={(e) => setForm(prev => ({ ...prev, holiday_date: e.target.value }))}
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        required
      />
      <textarea
        placeholder="Description (optional)"
        value={form.description}
        onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        rows="2"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.is_closed}
          onChange={(e) => setForm(prev => ({ ...prev, is_closed: e.target.checked }))}
          className="w-4 h-4 rounded"
        />
        <span>Fully Closed</span>
      </label>
      {!form.is_closed && (
        <div className="flex gap-2">
          <input 
            type="time" 
            value={form.opening_time} 
            onChange={(e) => setForm(prev => ({ ...prev, opening_time: e.target.value }))} 
            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm" 
          />
          <input 
            type="time" 
            value={form.closing_time} 
            onChange={(e) => setForm(prev => ({ ...prev, closing_time: e.target.value }))} 
            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm" 
          />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.is_recurring}
          onChange={(e) => setForm(prev => ({ ...prev, is_recurring: e.target.checked }))}
          className="w-4 h-4 rounded"
        />
        <span>Recurring Annually</span>
      </label>
      <button 
        type="submit" 
        disabled={saving} 
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
      >
        {saving ? 'Creating...' : 'Create Holiday'}
      </button>
    </form>
  );
}

function HolidayCard({ holiday, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch('/api/admin/settings/holidays', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holiday_id: holiday.id })
      });
      const data = await res.json();
      if (data.success) {
        onDelete();
      }
    } catch (err) {
      console.error('Failed to delete holiday:', err);
    } finally {
      setDeleting(false);
    }
  };

  const dateObj = new Date(holiday.holiday_date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex justify-between items-start">
      <div>
        <h3 className="font-medium text-gray-900">{holiday.holiday_name}</h3>
        <p className="text-sm text-gray-600">{formattedDate}</p>
        {holiday.description && <p className="text-sm text-gray-600 mt-1">{holiday.description}</p>}
        {!holiday.is_closed && <p className="text-sm text-gray-600">{holiday.opening_time} - {holiday.closing_time}</p>}
        {holiday.is_recurring && <p className="text-xs bg-blue-100 text-blue-700 inline-block px-2 py-1 rounded mt-2">Recurring Annually</p>}
      </div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
      >
        {deleting ? '...' : 'Delete'}
      </button>
    </div>
  );
}
