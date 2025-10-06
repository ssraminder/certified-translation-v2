import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import PhoneInput from '../../components/form/PhoneInput';
import { useAuth } from '../../middleware/auth';
import StatCard from '../../components/dashboard/StatCard';
import Tabs from '../../components/dashboard/Tabs';
import AddressCard from '../../components/dashboard/AddressCard';
import AddressFormModal from '../../components/dashboard/AddressFormModal';

export default function ProfilePage(){
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [phoneE164, setPhoneE164] = useState('');
  const [stats, setStats] = useState({ quotes: 0, orders: 0 });
  const [addresses, setAddresses] = useState({ billing: [], shipping: [] });
  const [activeTab, setActiveTab] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('billing');
  const [editAddress, setEditAddress] = useState(null);

  const tabs = useMemo(() => ([
    { key: 'personal', label: 'Personal Information' },
    { key: 'addresses', label: 'Addresses' },
    { key: 'preferences', label: 'Preferences' },
    { key: 'account', label: 'Account' },
  ]), []);

  useEffect(() => { if (user) fetchProfile(); }, [user]);

  async function fetchProfile(){
    try {
      const res = await fetch('/api/dashboard/profile');
      const data = await res.json();
      setProfile(data.user);
      setPhoneE164(data.user?.phone || '');
      setStats(data.stats || { quotes: 0, orders: 0 });
      setAddresses(data.addresses || { billing: [], shipping: [] });
    } catch (e) {
      setBanner({ type: 'error', text: 'Failed to load profile' });
    }
  }

  function onAdd(type){ setModalType(type); setEditAddress(null); setModalOpen(true); }
  function onEdit(address){ setModalType(address.address_type); setEditAddress(address); setModalOpen(true); }

  async function handleSaveProfile(e){
    e.preventDefault();
    try {
      setSaving(true);
      const body = {
        first_name: e.target.first_name.value.trim(),
        last_name: e.target.last_name.value.trim(),
        phone: phoneE164 || null,
        company_name: profile.account_type === 'business' ? (e.target.company_name.value.trim() || null) : null,
        business_license: profile.account_type === 'business' ? (e.target.business_license.value.trim() || null) : null,
        language_preference: e.target.language_preference.value || 'en',
      };
      const res = await fetch('/api/dashboard/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Failed to update');
      await fetchProfile();
      setBanner({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setBanner(null), 3000);
    } catch {
      setBanner({ type: 'error', text: 'Failed to update profile' });
    } finally { setSaving(false); }
  }

  async function handleSavePreferences(e){
    e.preventDefault();
    try {
      setSaving(true);
      const preferences = {
        email_notifications: e.target.email_notifications.checked,
        marketing_emails: e.target.marketing_emails.checked,
        sms_notifications: e.target.sms_notifications.checked,
      };
      const body = {
        first_name: profile.first_name,
        last_name: profile.last_name,
        language_preference: e.target.language_preference.value || 'en',
        preferences
      };
      const res = await fetch('/api/dashboard/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Failed to save preferences');
      await fetchProfile();
      setBanner({ type: 'success', text: 'Preferences updated!' });
      setTimeout(() => setBanner(null), 3000);
    } catch {
      setBanner({ type: 'error', text: 'Failed to save preferences' });
    } finally { setSaving(false); }
  }

  async function saveAddress(addr){
    const isEdit = !!addr.id;
    const url = isEdit ? `/api/dashboard/user-addresses/${addr.id}` : '/api/dashboard/user-addresses';
    const method = isEdit ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(addr) });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to save address');
    await fetchProfile();
    setBanner({ type: 'success', text: `Address ${isEdit ? 'updated' : 'added'}!` });
    setTimeout(() => setBanner(null), 3000);
  }

  async function deleteAddress(addr){
    if (!confirm('Are you sure you want to delete this address?')) return;
    const res = await fetch(`/api/dashboard/user-addresses/${addr.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { alert(data?.error || 'Failed to delete'); return; }
    await fetchProfile();
    setBanner({ type: 'success', text: 'Address deleted.' });
    setTimeout(() => setBanner(null), 3000);
  }

  async function makeDefault(addr){
    const res = await fetch(`/api/dashboard/user-addresses/${addr.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ is_default: true }) });
    const data = await res.json();
    if (!res.ok) { alert(data?.error || 'Failed to set default'); return; }
    await fetchProfile();
  }

  if (loading || !profile) {
    return (
      <DashboardLayout user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile & Settings</h1>
        <p className="text-gray-600">Manage your account information and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatCard title="Total Quotes" value={stats.quotes} icon="📄" color="cyan" />
        <StatCard title="Total Orders" value={stats.orders} icon="📦" color="green" />
      </div>

      {banner ? (
        <div className={`mb-4 p-3 rounded ${banner.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{banner.text}</div>
      ) : null}

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'personal' && (
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name *</label>
                <input name="first_name" defaultValue={profile.first_name || ''} className="mt-1 w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                <input name="last_name" defaultValue={profile.last_name || ''} className="mt-1 w-full border rounded-lg px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input value={profile.email || ''} disabled className="mt-1 w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-600" />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed. Contact support if needed.</p>
            </div>
            <div>
              <PhoneInput valueE164={phoneE164} onChangeE164={setPhoneE164} />
            </div>
            {profile.account_type === 'business' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Name</label>
                  <input name="company_name" defaultValue={profile.company_name || ''} className="mt-1 w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business License Number</label>
                  <input name="business_license" defaultValue={profile.business_license || ''} className="mt-1 w-full border rounded-lg px-3 py-2" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Language *</label>
              <select name="language_preference" defaultValue={profile.language_preference || 'en'} className="mt-1 w-full border rounded-lg px-3 py-2">
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
              </select>
            </div>
            <div className="text-right pt-2">
              <button type="submit" disabled={saving} className={`px-4 py-2 rounded-lg text-white ${saving ? 'bg-cyan-300' : 'bg-cyan-500 hover:bg-cyan-600'}`}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'addresses' && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Billing Addresses</h3>
              <button onClick={() => onAdd('billing')} className="px-3 py-2 bg-cyan-500 text-white rounded-lg">Add Billing Address</button>
            </div>
            <div className="space-y-3">
              {addresses.billing.length === 0 ? (
                <div className="text-sm text-gray-600">No billing addresses saved.</div>
              ) : (
                addresses.billing.map((a) => (
                  <AddressCard key={a.id} address={a} onEdit={onEdit} onDelete={deleteAddress} onMakeDefault={makeDefault} deleteDisabled={a.is_default && addresses.billing.filter(b => b.is_default).length === 1} />
                ))
              )}
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Shipping Addresses</h3>
              <button onClick={() => onAdd('shipping')} className="px-3 py-2 bg-cyan-500 text-white rounded-lg">Add Shipping Address</button>
            </div>
            <div className="space-y-3">
              {addresses.shipping.length === 0 ? (
                <div className="text-sm text-gray-600">No shipping addresses saved.</div>
              ) : (
                addresses.shipping.map((a) => (
                  <AddressCard key={a.id} address={a} onEdit={onEdit} onDelete={deleteAddress} onMakeDefault={makeDefault} deleteDisabled={a.is_default && addresses.shipping.filter(b => b.is_default).length === 1} />
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'preferences' && (
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSavePreferences} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Language</label>
              <select name="language_preference" defaultValue={profile.language_preference || 'en'} className="mt-1 w-full border rounded-lg px-3 py-2 max-w-xs">
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
              </select>
            </div>
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-2">Notifications</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="email_notifications" defaultChecked={!!profile.preferences?.email_notifications} />
                  <span>Receive updates about your orders and quotes</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="marketing_emails" defaultChecked={!!profile.preferences?.marketing_emails} />
                  <span>Receive promotional offers and updates</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="sms_notifications" defaultChecked={!!profile.preferences?.sms_notifications} />
                  <span>Receive text messages for important updates</span>
                </label>
              </div>
            </div>
            <div className="text-right pt-2">
              <button type="submit" disabled={saving} className={`px-4 py-2 rounded-lg text-white ${saving ? 'bg-cyan-300' : 'bg-cyan-500 hover:bg-cyan-600'}`}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'account' && (
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-600">Account Type</span><div className="font-medium text-gray-900">{(profile.account_type || '').replace(/\b\w/g, c => c.toUpperCase())}</div></div>
            <div><span className="text-gray-600">Account Status</span><div className="font-medium text-gray-900">{(profile.account_status || '').replace(/\b\w/g, c => c.toUpperCase())}</div></div>
            <div><span className="text-gray-600">Member Since</span><div className="font-medium text-gray-900">{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</div></div>
            <div><span className="text-gray-600">Last Login</span><div className="font-medium text-gray-900">{profile.last_login_at ? new Date(profile.last_login_at).toLocaleString() : 'N/A'}</div></div>
          </div>
          <div className="mt-8 border-t pt-6">
            <h4 className="text-base font-semibold text-red-600 mb-2">Danger Zone</h4>
            <p className="text-sm text-gray-600 mb-3">Deleting your account is permanent and cannot be undone.</p>
            <button onClick={() => alert('Account deletion feature coming soon')} className="px-4 py-2 rounded-lg border border-red-300 text-red-700 bg-red-50">Delete Account</button>
          </div>
        </section>
      )}

      <AddressFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editAddress}
        addressType={modalType}
        onSave={async (data) => {
          if (editAddress) await saveAddress({ ...editAddress, ...data });
          else await saveAddress(data);
        }}
      />
    </DashboardLayout>
  );
}
