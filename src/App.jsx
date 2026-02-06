import { useState, useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const MAX_LEVEL = 6
const MAX_TEXT_LENGTH = 200

// Telegram WebApp helpers
function getTgInitData() {
  try {
    return window.Telegram?.WebApp?.initData || ''
  } catch {
    return ''
  }
}

function getTgUser() {
  try {
    return window.Telegram?.WebApp?.initDataUnsafe?.user || null
  } catch {
    return null
  }
}

function showAlert(message) {
  try {
    if (window.Telegram?.WebApp?.showAlert) {
      window.Telegram.WebApp.showAlert(message)
    } else {
      alert(message)
    }
  } catch {
    alert(message)
  }
}

// Format relative time
function formatTimeAgo(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'upravo sada'
  if (diffMins < 60) return `pre ${diffMins} min`
  if (diffHours < 24) return `pre ${diffHours}h`
  if (diffDays < 7) return `pre ${diffDays}d`
  return date.toLocaleDateString('sr-RS')
}

// Clown image component with fallback
function ClownImage({ level, size = 'md' }) {
  const [hasError, setHasError] = useState(false)
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  }

  if (hasError) {
    return (
      <div className={`${sizeClasses[size]} flex items-center justify-center bg-gray-700 rounded-full text-4xl`}>
        🤡
      </div>
    )
  }

  return (
    <img
      src={`/images/${level}.png`}
      alt={`Level ${level} clown`}
      className={`${sizeClasses[size]} rounded-full object-cover`}
      onError={() => setHasError(true)}
    />
  )
}

// User card component
function UserCard({ user }) {
  const displayName = user.clown_name || user.first_name || user.username || 'Klovn'

  return (
    <div className="bg-gray-800/80 rounded-2xl p-4 border border-gray-700 hover:border-orange-600 transition-all duration-200 shadow-lg">
      <div className="flex items-start gap-4">
        <ClownImage level={user.level ?? 0} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{displayName}</h3>
            <span className="px-2 py-0.5 bg-orange-600 text-white text-xs font-bold rounded-full shrink-0">
              Lv.{user.level ?? 0}
            </span>
          </div>
          {user.username && (
            <p className="text-gray-400 text-sm truncate">@{user.username}</p>
          )}
          {user.location && (
            <p className="text-gray-300 text-sm mt-1 truncate">
              📍 {user.location}
            </p>
          )}
          {user.status_message && (
            <p className="text-gray-300 text-sm mt-1 line-clamp-2">
              💬 {user.status_message}
            </p>
          )}
          <p className="text-gray-500 text-xs mt-2">
            🕒 {formatTimeAgo(user.updated_at)}
          </p>
        </div>
      </div>
    </div>
  )
}

// Dashboard tab component
function DashboardTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/users`)
      if (!res.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      setError(err.message)
      console.error('Fetch users error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const filteredUsers = users.filter(user => {
    if (!search.trim()) return true
    const searchLower = search.toLowerCase()
    const name = (user.clown_name || user.first_name || user.username || '').toLowerCase()
    const username = (user.username || '').toLowerCase()
    const location = (user.location || '').toLowerCase()
    const status = (user.status_message || '').toLowerCase()
    return name.includes(searchLower) ||
           username.includes(searchLower) ||
           location.includes(searchLower) ||
           status.includes(searchLower)
  })

  // Stats
  const totalUsers = users.length
  const maxLevelUsers = users.filter(u => (u.level ?? 0) >= MAX_LEVEL).length
  const usersWithLocation = users.filter(u => u.location).length

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Pretraži klovnove..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
        />
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            '🔄'
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-xl p-4 mb-4 text-red-200">
          {error}
        </div>
      )}

      {/* User list */}
      {loading && users.length === 0 ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-orange-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {search ? 'Nema rezultata pretrage' : 'Nema klovnova'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <UserCard key={user.telegram_id} user={user} />
          ))}
        </div>
      )}

      {/* Stats footer */}
      <div className="fixed bottom-16 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 p-3">
        <div className="max-w-2xl mx-auto flex justify-around text-center">
          <div>
            <div className="text-orange-500 font-bold text-lg">{totalUsers}</div>
            <div className="text-gray-500 text-xs">Ukupno</div>
          </div>
          <div>
            <div className="text-orange-500 font-bold text-lg">{maxLevelUsers}</div>
            <div className="text-gray-500 text-xs">Max Level</div>
          </div>
          <div>
            <div className="text-orange-500 font-bold text-lg">{usersWithLocation}</div>
            <div className="text-gray-500 text-xs">Sa lokacijom</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Edit other clown tab component
function EditOtherTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editLevel, setEditLevel] = useState(0)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/users`)
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      console.error('Fetch users error:', err)
      showAlert('Greška pri učitavanju korisnika')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // When user is selected, load their current status and level
  useEffect(() => {
    if (selectedUserId) {
      const user = users.find(u => String(u.telegram_id) === selectedUserId)
      if (user) {
        setEditStatus(user.status_message || '')
        setEditLevel(user.level ?? 0)
      }
    } else {
      setEditStatus('')
      setEditLevel(0)
    }
  }, [selectedUserId, users])

  const selectedUser = users.find(u => String(u.telegram_id) === selectedUserId)

  const handleSaveStatus = async () => {
    if (!selectedUserId) {
      showAlert('Molimo izaberi korisnika')
      return
    }

    const initData = getTgInitData()
    if (!initData) {
      showAlert('Telegram WebApp nije dostupan')
      return
    }

    if (editStatus.length > MAX_TEXT_LENGTH) {
      showAlert(`Status je predugačak (max ${MAX_TEXT_LENGTH} karaktera)`)
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/update-user-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData
        },
        body: JSON.stringify({
          target_telegram_id: selectedUserId,
          status_message: editStatus.trim() || null,
          level: editLevel
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save status')
      }

      // Update local state
      setUsers(prev => prev.map(u =>
        String(u.telegram_id) === selectedUserId
          ? { ...u, status_message: editStatus.trim() || null, level: editLevel }
          : u
      ))

      showAlert('Status sačuvan!')
    } catch (err) {
      console.error('Save status error:', err)
      showAlert(err.message || 'Greška pri čuvanju statusa')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <svg className="animate-spin h-8 w-8 text-orange-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-20">
      <div className="bg-gray-800/80 rounded-2xl p-6 border border-gray-700 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">✏️ Uredi drugog klovna</h3>

        {/* User selector */}
        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-2">👤 Izaberi klovna</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors appearance-none cursor-pointer"
          >
            <option value="">-- Izaberi korisnika --</option>
            {users.map(user => {
              const displayName = user.clown_name || user.first_name || user.username || 'Klovn'
              return (
                <option key={user.telegram_id} value={String(user.telegram_id)}>
                  {displayName} {user.username ? `(@${user.username})` : ''} - Lv.{user.level ?? 0}
                </option>
              )
            })}
          </select>
        </div>

        {/* Selected user preview */}
        {selectedUser && (
          <div className="mb-4 p-4 bg-gray-700/50 rounded-xl border border-gray-600">
            <div className="flex items-center gap-3">
              <ClownImage level={editLevel} size="md" />
              <div>
                <div className="text-white font-medium">
                  {selectedUser.clown_name || selectedUser.first_name || selectedUser.username || 'Klovn'}
                </div>
                {selectedUser.username && (
                  <div className="text-gray-400 text-sm">@{selectedUser.username}</div>
                )}
                {selectedUser.location && (
                  <div className="text-gray-300 text-sm">📍 {selectedUser.location}</div>
                )}
              </div>
            </div>

            {/* Level controls */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => setEditLevel(prev => Math.max(0, prev - 1))}
                disabled={editLevel <= 0}
                className={`w-12 h-12 rounded-xl font-bold text-xl transition-all ${
                  editLevel <= 0
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
                }`}
              >
                −
              </button>

              <div className="px-5 py-2 bg-orange-600 text-white font-bold rounded-xl min-w-[90px] text-center">
                LVL {editLevel}
              </div>

              <button
                onClick={() => setEditLevel(prev => Math.min(MAX_LEVEL, prev + 1))}
                disabled={editLevel >= MAX_LEVEL}
                className={`w-12 h-12 rounded-xl font-bold text-xl transition-all ${
                  editLevel >= MAX_LEVEL
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg'
                }`}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Status message */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-400 text-sm">💬 Novi status</label>
            <span className={`text-xs ${editStatus.length > MAX_TEXT_LENGTH ? 'text-red-500' : 'text-gray-500'}`}>
              {editStatus.length}/{MAX_TEXT_LENGTH}
            </span>
          </div>
          <textarea
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            placeholder="Upiši novi status za ovog klovna..."
            maxLength={MAX_TEXT_LENGTH}
            rows={3}
            disabled={!selectedUserId}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSaveStatus}
          disabled={saving || !selectedUserId}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-600 py-3 rounded-xl font-semibold text-white transition-all shadow-lg hover:shadow-orange-500/25 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Čuvam...
            </span>
          ) : (
            '💾 Sačuvaj status'
          )}
        </button>
      </div>
    </div>
  )
}

// Profile tab component
function ProfileTab() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)

  // Local edit state - changes are saved only when "Sačuvaj" is clicked
  const [editLevel, setEditLevel] = useState(0)
  const [editLocation, setEditLocation] = useState('')
  const [editStatus, setEditStatus] = useState('')

  const tgUser = getTgUser()

  // Check if there are unsaved changes
  const hasChanges = profile && (
    editLevel !== (profile.level ?? 0) ||
    editLocation !== (profile.location || '') ||
    editStatus !== (profile.status_message || '')
  )

  const fetchProfile = useCallback(async () => {
    if (!tgUser?.id) return

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/users`)
      if (!res.ok) throw new Error('Failed to fetch profile')

      const users = await res.json()
      const myProfile = users.find(u => String(u.telegram_id) === String(tgUser.id))

      if (myProfile) {
        setProfile(myProfile)
        // Initialize local edit state from profile
        setEditLevel(myProfile.level ?? 0)
        setEditLocation(myProfile.location || '')
        setEditStatus(myProfile.status_message || '')
      }
    } catch (err) {
      console.error('Fetch profile error:', err)
      showAlert('Greška pri učitavanju profila')
    } finally {
      setLoading(false)
    }
  }, [tgUser?.id])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Local level controls - no API call
  const handleLevelUp = () => {
    if (editLevel < MAX_LEVEL) {
      setEditLevel(prev => prev + 1)
    }
  }

  const handleLevelDown = () => {
    if (editLevel > 0) {
      setEditLevel(prev => prev - 1)
    }
  }

  // Cancel changes - reset to original values
  const handleCancelChanges = () => {
    if (profile) {
      setEditLevel(profile.level ?? 0)
      setEditLocation(profile.location || '')
      setEditStatus(profile.status_message || '')
    }
  }

  // Save all changes with single API call
  const handleSaveProfile = async () => {
    const initData = getTgInitData()
    if (!initData) {
      showAlert('Telegram WebApp nije dostupan')
      return
    }

    // Validation
    if (editLevel < 0 || editLevel > MAX_LEVEL) {
      showAlert(`Level mora biti između 0 i ${MAX_LEVEL}`)
      return
    }

    if (editLocation.length > MAX_TEXT_LENGTH) {
      showAlert(`Lokacija je predugačka (max ${MAX_TEXT_LENGTH} karaktera)`)
      return
    }

    if (editStatus.length > MAX_TEXT_LENGTH) {
      showAlert(`Status je predugačak (max ${MAX_TEXT_LENGTH} karaktera)`)
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData
        },
        body: JSON.stringify({
          level: editLevel,
          location: editLocation.trim() || null,
          status_message: editStatus.trim() || null
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save profile')
      }

      // Update profile with new values
      setProfile(prev => prev ? {
        ...prev,
        level: editLevel,
        location: editLocation.trim() || null,
        status_message: editStatus.trim() || null
      } : null)

      showAlert('Profil sačuvan!')
    } catch (err) {
      console.error('Save profile error:', err)
      showAlert(err.message || 'Greška pri čuvanju profila')
    } finally {
      setSaving(false)
    }
  }

  const displayName = profile?.clown_name || profile?.first_name || tgUser?.first_name || 'Klovn'

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <svg className="animate-spin h-8 w-8 text-orange-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-20">
      {/* Profile header */}
      <div className="bg-gray-800/80 rounded-2xl p-6 border border-gray-700 shadow-lg mb-4 text-center">
        {/* Clown image updates in real-time based on editLevel */}
        <ClownImage level={editLevel} size="xl" />
        <h2 className="text-xl font-bold text-white mt-4">{displayName}</h2>

        {/* Unsaved changes indicator */}
        {hasChanges && (
          <div className="mt-2 text-yellow-500 text-sm">
            ⚠️ Imaš nesačuvane izmene
          </div>
        )}

        {/* Level controls in one row */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={handleLevelDown}
            disabled={editLevel <= 0}
            className={`w-14 h-14 rounded-xl font-bold text-xl transition-all ${
              editLevel <= 0
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
            }`}
          >
            −
          </button>

          <div className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl min-w-[100px]">
            LVL {editLevel}
          </div>

          <button
            onClick={handleLevelUp}
            disabled={editLevel >= MAX_LEVEL}
            className={`w-14 h-14 rounded-xl font-bold text-xl transition-all ${
              editLevel >= MAX_LEVEL
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg'
            }`}
          >
            +
          </button>
        </div>

        <div className="text-gray-500 text-xs mt-2">
          Max level: {MAX_LEVEL}
        </div>
      </div>

      {/* Edit profile */}
      <div className="bg-gray-800/80 rounded-2xl p-6 border border-gray-700 shadow-lg space-y-4">
        <h3 className="text-lg font-semibold text-white mb-4">Uredi profil</h3>

        {/* Location */}
        <div>
          <label className="block text-gray-400 text-sm mb-2">📍 Lokacija</label>
          <input
            type="text"
            value={editLocation}
            onChange={(e) => setEditLocation(e.target.value)}
            placeholder="npr. Kafana Kod Mike"
            maxLength={MAX_TEXT_LENGTH}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        {/* Status message */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-400 text-sm">💬 Status poruka</label>
            <span className={`text-xs ${editStatus.length > MAX_TEXT_LENGTH ? 'text-red-500' : 'text-gray-500'}`}>
              {editStatus.length}/{MAX_TEXT_LENGTH}
            </span>
          </div>
          <textarea
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            placeholder="npr. Pijem kafu ☕"
            maxLength={MAX_TEXT_LENGTH}
            rows={3}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-600 py-3 rounded-xl font-semibold text-white transition-all shadow-lg hover:shadow-orange-500/25"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Čuvam...
            </span>
          ) : (
            '💾 Sačuvaj profil'
          )}
        </button>

        {/* Cancel changes button - only show if there are changes */}
        {hasChanges && (
          <button
            onClick={handleCancelChanges}
            disabled={saving}
            className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 py-3 rounded-xl font-semibold text-gray-300 transition-all border border-gray-600"
          >
            ↩️ Otkaži izmene
          </button>
        )}
      </div>
    </div>
  )
}

// Spin game tab component - fully frontend, no Supabase
function SpinTab() {
  const [names, setNames] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [selectedName, setSelectedName] = useState(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [spinStep, setSpinStep] = useState(0)
  const [spinTotal, setSpinTotal] = useState(0)
  const [spinNames, setSpinNames] = useState([])

  // Animate spin via useEffect - React manages the timer lifecycle
  useEffect(() => {
    if (!isSpinning || spinStep >= spinTotal) return
    const delay = 60 + spinStep * 8
    const timer = setTimeout(() => {
      const idx = (spinStep + 1) % spinNames.length
      setHighlightIndex(idx)
      if (spinStep + 1 >= spinTotal) {
        setSelectedName(spinNames[idx])
        setIsSpinning(false)
        setHighlightIndex(-1)
      } else {
        setSpinStep(prev => prev + 1)
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [isSpinning, spinStep, spinTotal, spinNames])

  const addName = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    if (names.includes(trimmed)) {
      showAlert('To polje je vec dodato!')
      return
    }
    setNames(prev => [...prev, trimmed])
    setInputValue('')
    setSelectedName(null)
  }

  const removeName = (index) => {
    setNames(prev => prev.filter((_, i) => i !== index))
    setSelectedName(null)
    setHighlightIndex(-1)
  }

  const handleSpin = () => {
    if (names.length < 2) {
      showAlert('Dodaj bar 2 polja da bi zavrteo!')
      return
    }
    setSelectedName(null)
    setHighlightIndex(0)
    setSpinNames([...names])
    setSpinTotal(20 + Math.floor(Math.random() * 15))
    setSpinStep(0)
    setIsSpinning(true)
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-20">
      <div className="bg-gray-800/80 rounded-2xl p-6 border border-gray-700 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-1">🎰 Clown Spin</h3>
        <p className="text-gray-400 text-sm mb-4">Dodaj polja i zavrti da vidis sta je izabrano!</p>

        {/* Add name input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addName()}
            placeholder="Dodaj polje..."
            maxLength={50}
            className="flex-1 bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
          <button
            onClick={addName}
            disabled={!inputValue.trim()}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-xl font-bold text-lg transition-colors disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>

        {/* Names list */}
        {names.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🤡</div>
            <p>Nema polja. Dodaj neko polje!</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {names.map((name, index) => (
              <div
                key={index}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-150 ${
                  selectedName === name
                    ? 'bg-orange-600/30 border-orange-500 shadow-lg shadow-orange-500/20'
                    : highlightIndex === index
                    ? 'bg-orange-500/20 border-orange-600'
                    : 'bg-gray-700/50 border-gray-600'
                }`}
              >
                <span className={`font-medium ${
                  selectedName === name ? 'text-orange-300 text-lg' : 'text-white'
                }`}>
                  {selectedName === name && '🎉 '}{name}
                </span>
                <button
                  onClick={() => removeName(index)}
                  disabled={isSpinning}
                  className="text-gray-400 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ml-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Spin result */}
        {selectedName && (
          <div className="text-center py-4 mb-4 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-xl border border-orange-500/50">
            <div className="text-3xl mb-1">🎉🤡🎉</div>
            <div className="text-orange-400 text-sm">Izabrano polje:</div>
            <div className="text-white text-2xl font-bold mt-1">{selectedName}</div>
          </div>
        )}

        {/* Spin button */}
        <button
          onClick={handleSpin}
          disabled={isSpinning || names.length < 2}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            isSpinning
              ? 'bg-orange-600 animate-pulse text-white'
              : names.length < 2
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-orange-500/25'
          }`}
        >
          {isSpinning ? '🎰 Vrti se...' : '🎰 ZAVRTI!'}
        </button>

        {/* Counter */}
        <div className="text-center text-gray-500 text-xs mt-3">
          {names.length} {names.length === 1 ? 'polje' : 'polja'} u igri
        </div>
      </div>
    </div>
  )
}

// Stat progress bar
function StatBar({ label, value, max = 100, color = 'orange' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const colors = {
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
  }
  return (
    <div className="mb-1">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{value}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div className={`${colors[color] || colors.orange} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// Player card for duel
function DuelPlayerCard({ player, isCurrentTurn }) {
  if (!player?.state) return null
  const name = player.clown_name || player.first_name || player.username || 'Klovn'
  const s = player.state
  return (
    <div className={`bg-gray-700/50 rounded-xl p-3 border ${isCurrentTurn ? 'border-orange-500' : 'border-gray-600'}`}>
      <div className="text-center mb-2">
        <div className="text-white font-semibold text-sm truncate">{name}</div>
        {isCurrentTurn && <div className="text-orange-400 text-xs">Na potezu!</div>}
      </div>
      <StatBar label="🍺 Pijanstvo" value={s.alcometer} color={s.alcometer > 80 ? 'red' : 'orange'} />
      <StatBar label="🏆 Respect" value={s.respect} color={s.respect < 20 ? 'red' : 'green'} />
      <StatBar label="🍽️ Stomak" value={s.stomak} color="blue" />
      <div className="text-center mt-2">
        <span className="text-yellow-400 text-sm font-bold">💰 {s.novcanik} din</span>
      </div>
      <div className="text-center text-gray-500 text-xs mt-1">
        Turn: {s.turn_number}/10 | Foulovi: {s.pijani_foulovi}
      </div>
    </div>
  )
}

// Kafanski Duel tab component
function DuelTab() {
  const [view, setView] = useState('lobby') // lobby | game
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [lobbyData, setLobbyData] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [activeDuelId, setActiveDuelId] = useState(null)
  const [lastFlavor, setLastFlavor] = useState(null)
  const [gameOver, setGameOver] = useState(null)

  const tgUser = getTgUser()
  const initData = getTgInitData()

  const fetchLobby = useCallback(async () => {
    if (!initData) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/duels?op=active`, {
        headers: { 'x-telegram-init-data': initData }
      })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setLobbyData(data)
    } catch (err) {
      console.error('Lobby fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [initData])

  const fetchGameState = useCallback(async (duelId) => {
    if (!initData || !duelId) return
    try {
      const res = await fetch(`${API_BASE}/api/duels?op=state&id=${duelId}`, {
        headers: { 'x-telegram-init-data': initData }
      })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setGameState(data)

      if (data.duel.status === 'finished') {
        const myId = String(data.my_id)
        const winnerId = String(data.duel.winner_id)
        const players = data.players
        const winnerPlayer = Object.values(players).find(p => String(p.telegram_id) === winnerId)
        const winnerName = winnerPlayer?.clown_name || winnerPlayer?.first_name || winnerPlayer?.username || 'Klovn'
        setGameOver({
          winner_id: winnerId,
          winner_name: winnerName,
          is_me: myId === winnerId,
        })
      }
    } catch (err) {
      console.error('Game state fetch error:', err)
    }
  }, [initData])

  useEffect(() => {
    if (view === 'lobby') fetchLobby()
  }, [view, fetchLobby])

  // Poll for updates when it's not my turn
  useEffect(() => {
    if (view !== 'game' || !activeDuelId || !gameState) return
    if (gameState.duel.status === 'finished') return
    if (gameState.is_my_turn) return

    const timer = setInterval(() => fetchGameState(activeDuelId), 3000)
    return () => clearInterval(timer)
  }, [view, activeDuelId, gameState, fetchGameState])

  const handleChallenge = async (opponentId) => {
    if (!initData) return
    setActing(true)
    try {
      const res = await fetch(`${API_BASE}/api/duels?op=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData },
        body: JSON.stringify({ opponent_id: opponentId })
      })
      const data = await res.json()
      if (!res.ok) { showAlert(data.error || 'Greska'); return }
      showAlert('Izazov poslan!')
      fetchLobby()
    } catch (err) {
      showAlert('Greska pri slanju izazova')
    } finally {
      setActing(false)
    }
  }

  const handleAccept = async (duelId) => {
    if (!initData) return
    setActing(true)
    try {
      const res = await fetch(`${API_BASE}/api/duels?op=accept&id=${duelId}`, {
        method: 'POST',
        headers: { 'x-telegram-init-data': initData }
      })
      if (!res.ok) { const d = await res.json(); showAlert(d.error || 'Greska'); return }
      setActiveDuelId(duelId)
      setGameOver(null)
      setLastFlavor(null)
      await fetchGameState(duelId)
      setView('game')
    } catch (err) {
      showAlert('Greska')
    } finally {
      setActing(false)
    }
  }

  const handleDecline = async (duelId) => {
    if (!initData) return
    try {
      await fetch(`${API_BASE}/api/duels?op=decline&id=${duelId}`, {
        method: 'POST',
        headers: { 'x-telegram-init-data': initData }
      })
      fetchLobby()
    } catch (err) {
      showAlert('Greska')
    }
  }

  const handleOpenGame = async (duelId) => {
    setActiveDuelId(duelId)
    setGameOver(null)
    setLastFlavor(null)
    await fetchGameState(duelId)
    setView('game')
  }

  const handleAction = async (actionKey) => {
    if (!initData || !activeDuelId || acting) return
    setActing(true)
    try {
      const res = await fetch(`${API_BASE}/api/duels?op=action&id=${activeDuelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData },
        body: JSON.stringify({ action: actionKey })
      })
      const data = await res.json()
      if (!res.ok) { showAlert(data.error || 'Greska'); return }
      setLastFlavor(data.flavor_text)
      if (data.game_over) {
        await fetchGameState(activeDuelId)
      } else {
        await fetchGameState(activeDuelId)
      }
    } catch (err) {
      showAlert('Greska pri akciji')
    } finally {
      setActing(false)
    }
  }

  const getName = (u) => u?.clown_name || u?.first_name || u?.username || 'Klovn'
  const getNameStr = (d, prefix) => d[`${prefix}_name`] || d[`${prefix}_first`] || d[`${prefix}_user`] || 'Klovn'

  // ========== LOADING ==========
  if (loading && !lobbyData && !gameState) {
    return (
      <div className="flex justify-center items-center py-24">
        <svg className="animate-spin h-8 w-8 text-orange-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  // ========== GAME VIEW ==========
  if (view === 'game' && gameState) {
    const d = gameState.duel
    const players = gameState.players
    const p1 = players[d.player1_id]
    const p2 = players[d.player2_id]
    const isFinished = d.status === 'finished'
    const myTurn = gameState.is_my_turn

    return (
      <div className="max-w-md mx-auto p-4 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => { setView('lobby'); fetchLobby() }}
            className="text-gray-400 hover:text-white text-sm">
            ← Nazad
          </button>
          <h3 className="text-white font-semibold">⚔️ Kafanski Duel</h3>
          <button onClick={() => fetchGameState(activeDuelId)}
            className="text-gray-400 hover:text-white text-sm">
            🔄
          </button>
        </div>

        {/* Player cards side by side */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <DuelPlayerCard player={p1} isCurrentTurn={String(d.current_turn_user) === String(d.player1_id) && !isFinished} />
          <DuelPlayerCard player={p2} isCurrentTurn={String(d.current_turn_user) === String(d.player2_id) && !isFinished} />
        </div>

        {/* Last action flavor text */}
        {lastFlavor && (
          <div className="bg-gray-700/50 rounded-xl p-3 mb-3 border border-gray-600 text-center">
            <p className="text-orange-300 text-sm italic">"{lastFlavor}"</p>
          </div>
        )}

        {/* Game over */}
        {gameOver && (
          <div className="text-center py-4 mb-3 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-xl border border-orange-500/50">
            <div className="text-3xl mb-1">{gameOver.is_me ? '🏆🤡🏆' : '😵💀😵'}</div>
            <div className="text-orange-400 text-sm">{gameOver.is_me ? 'Pobeda!' : 'Poraz!'}</div>
            <div className="text-white text-xl font-bold mt-1">
              {gameOver.is_me ? 'Cestitamo!' : `Pobedio: ${gameOver.winner_name}`}
            </div>
            <button onClick={() => { setView('lobby'); fetchLobby() }}
              className="mt-3 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-medium">
              Nazad u lobi
            </button>
          </div>
        )}

        {/* Action buttons - only if my turn */}
        {myTurn && !isFinished && gameState.available_actions && (
          <div className="space-y-2">
            <div className="text-orange-400 text-sm font-semibold text-center mb-1">Tvoj red! Izaberi akciju:</div>

            {/* Pice */}
            <div>
              <div className="text-gray-500 text-xs mb-1">🍺 Pice</div>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(gameState.available_actions).filter(([,a]) => a.category === 'pice').map(([key, a]) => (
                  <button key={key} onClick={() => handleAction(key)} disabled={acting || !a.affordable}
                    className={`p-2 rounded-xl text-left text-xs border transition-all ${
                      !a.affordable ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-700 border-gray-600 hover:border-orange-500 text-white'
                    }`}>
                    <div className="font-medium">{a.emoji} {a.label}</div>
                    <div className="text-gray-400 mt-0.5">💰{a.cost} din</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Hrana */}
            <div>
              <div className="text-gray-500 text-xs mb-1">🍽️ Hrana</div>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(gameState.available_actions).filter(([,a]) => a.category === 'hrana').map(([key, a]) => (
                  <button key={key} onClick={() => handleAction(key)} disabled={acting || !a.affordable}
                    className={`p-2 rounded-xl text-left text-xs border transition-all ${
                      !a.affordable ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-700 border-gray-600 hover:border-orange-500 text-white'
                    }`}>
                    <div className="font-medium">{a.emoji} {a.label}</div>
                    <div className="text-gray-400 mt-0.5">💰{a.cost} din</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Specijal */}
            <div>
              <div className="text-gray-500 text-xs mb-1">⚡ Specijal</div>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(gameState.available_actions).filter(([,a]) => a.category === 'specijal').map(([key, a]) => (
                  <button key={key} onClick={() => handleAction(key)} disabled={acting || !a.affordable}
                    className={`p-2 rounded-xl text-left text-xs border transition-all ${
                      !a.affordable ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-700 border-gray-600 hover:border-orange-500 text-white'
                    }`}>
                    <div className="font-medium">{a.emoji} {a.label}</div>
                    <div className="text-gray-400 mt-0.5">{a.cost > 0 ? `💰${a.cost} din` : 'Besplatno'}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Waiting for opponent */}
        {!myTurn && !isFinished && (
          <div className="text-center py-6">
            <div className="text-2xl mb-2 animate-bounce">⏳</div>
            <div className="text-gray-400 text-sm">Cekas protivnika da odigra...</div>
          </div>
        )}

        {/* Recent action log */}
        {gameState.recent_log?.length > 0 && (
          <div className="mt-3 space-y-1">
            <div className="text-gray-500 text-xs mb-1">Poslednje akcije:</div>
            {gameState.recent_log.slice(0, 6).map((entry, i) => {
              const who = Object.values(players).find(p => String(p.telegram_id) === String(entry.user_id))
              return (
                <div key={i} className="text-xs px-3 py-1.5 bg-gray-700/30 rounded-lg">
                  <span className="text-orange-400">T{entry.turn_number}</span>
                  {' '}
                  <span className="text-white font-medium">{getName(who)}</span>
                  {' '}
                  <span className="text-gray-400">{entry.flavor_text || entry.action_type}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ========== LOBBY VIEW ==========
  const myId = lobbyData?.my_id ? String(lobbyData.my_id) : String(tgUser?.id)

  // Incoming challenges (I'm player2, status=waiting)
  const incoming = (lobbyData?.active || []).filter(d =>
    String(d.player2_id) === myId && d.status === 'waiting'
  )
  // Active games
  const activeGames = (lobbyData?.active || []).filter(d => d.status === 'active')
  // My pending challenges
  const myPending = (lobbyData?.active || []).filter(d =>
    String(d.player1_id) === myId && d.status === 'waiting'
  )
  // Recent finished
  const recentFinished = lobbyData?.recent_finished || []
  // Opponents
  const opponents = lobbyData?.opponents || []

  return (
    <div className="max-w-md mx-auto p-4 pb-20">
      {/* Header */}
      <div className="bg-gray-800/80 rounded-2xl p-4 border border-gray-700 shadow-lg mb-3">
        <h3 className="text-lg font-semibold text-white mb-1">⚔️ Kafanski Duel</h3>
        <p className="text-gray-400 text-sm">Izazovi klovna na duel u kafani!</p>
      </div>

      {/* Incoming challenges */}
      {incoming.length > 0 && (
        <div className="bg-orange-900/30 rounded-2xl p-4 border border-orange-700 mb-3">
          <h4 className="text-orange-400 font-semibold text-sm mb-2">📨 Primljeni izazovi</h4>
          {incoming.map(d => (
            <div key={d.id} className="flex items-center justify-between bg-gray-800/50 rounded-xl p-3 mb-1.5">
              <span className="text-white text-sm font-medium">{getNameStr(d, 'p1')}</span>
              <div className="flex gap-1.5">
                <button onClick={() => handleAccept(d.id)} disabled={acting}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-medium">
                  Prihvati
                </button>
                <button onClick={() => handleDecline(d.id)} disabled={acting}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg font-medium">
                  Odbij
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active games */}
      {activeGames.length > 0 && (
        <div className="bg-gray-800/80 rounded-2xl p-4 border border-gray-700 mb-3">
          <h4 className="text-green-400 font-semibold text-sm mb-2">🎮 Aktivni dueli</h4>
          {activeGames.map(d => {
            const oppName = String(d.player1_id) === myId ? getNameStr(d, 'p2') : getNameStr(d, 'p1')
            const isMyTurn = String(d.current_turn_user) === myId
            return (
              <button key={d.id} onClick={() => handleOpenGame(d.id)}
                className={`w-full flex items-center justify-between rounded-xl p-3 mb-1.5 border transition-all ${
                  isMyTurn ? 'bg-orange-900/30 border-orange-600' : 'bg-gray-700/50 border-gray-600'
                }`}>
                <div className="text-left">
                  <span className="text-white text-sm font-medium">vs {oppName}</span>
                  {isMyTurn && <span className="text-orange-400 text-xs ml-2">Tvoj red!</span>}
                </div>
                <span className="text-gray-400 text-xs">Otvori →</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Pending challenges I sent */}
      {myPending.length > 0 && (
        <div className="bg-gray-800/80 rounded-2xl p-4 border border-gray-700 mb-3">
          <h4 className="text-yellow-400 font-semibold text-sm mb-2">⏳ Poslati izazovi</h4>
          {myPending.map(d => (
            <div key={d.id} className="flex items-center justify-between bg-gray-700/50 rounded-xl p-3 mb-1.5">
              <span className="text-white text-sm">Ceka: {getNameStr(d, 'p2')}</span>
              <span className="text-gray-500 text-xs">Na cekanju</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent finished */}
      {recentFinished.length > 0 && (
        <div className="bg-gray-800/80 rounded-2xl p-4 border border-gray-700 mb-3">
          <h4 className="text-gray-400 font-semibold text-sm mb-2">🏁 Zavrseni dueli</h4>
          {recentFinished.map(d => {
            const oppName = String(d.player1_id) === myId ? getNameStr(d, 'p2') : getNameStr(d, 'p1')
            const won = String(d.winner_id) === myId
            return (
              <div key={d.id} className="flex items-center justify-between bg-gray-700/50 rounded-xl p-3 mb-1.5">
                <span className="text-white text-sm">vs {oppName}</span>
                <span className={`text-xs font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
                  {won ? '🏆 Pobeda' : '💀 Poraz'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Challenge opponents */}
      <div className="bg-gray-800/80 rounded-2xl p-4 border border-gray-700">
        <h4 className="text-gray-300 font-semibold text-sm mb-2">🤡 Izazovi klovna</h4>
        {opponents.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-4">Nema dostupnih protivnika</div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {opponents.map(u => (
              <div key={u.telegram_id} className="flex items-center justify-between bg-gray-700/50 rounded-xl p-3">
                <div>
                  <span className="text-white text-sm font-medium">{getName(u)}</span>
                  <span className="text-orange-400 text-xs ml-2">Lv.{u.level ?? 0}</span>
                </div>
                <button onClick={() => handleChallenge(u.telegram_id)} disabled={acting}
                  className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-600 text-white text-xs rounded-lg font-medium">
                  ⚔️ Izazovi
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Main App component
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    try {
      const WebApp = window.Telegram?.WebApp
      if (WebApp) {
        WebApp.ready()
        // WebApp.expand() // ostavi ugašeno da compact radi
        WebApp.setHeaderColor('#111827')
        WebApp.setBackgroundColor('#111827')
      }
    } catch (err) {
      console.error('Telegram WebApp init error:', err)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-orange-900/30">
      {/* Content */}
      <div className="pt-2">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'edit-other' && <EditOtherTab />}
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'spin' && <SpinTab />}
        {activeTab === 'duel' && <DuelTab />}
      </div>

      {/* Sticky tab navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 safe-area-inset-bottom">
        <div className="flex">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-4 text-center font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'text-orange-500 bg-orange-500/10'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="text-xl">📊</span>
            <div className="text-xs mt-1">Dashboard</div>
          </button>
          <button
            onClick={() => setActiveTab('edit-other')}
            className={`flex-1 py-4 text-center font-medium transition-colors ${
              activeTab === 'edit-other'
                ? 'text-orange-500 bg-orange-500/10'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="text-xl">✏️</span>
            <div className="text-xs mt-1">Uredi klovna</div>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-4 text-center font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-orange-500 bg-orange-500/10'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="text-xl">🤡</span>
            <div className="text-xs mt-1">Moj Profil</div>
          </button>
          <button
            onClick={() => setActiveTab('spin')}
            className={`flex-1 py-4 text-center font-medium transition-colors ${
              activeTab === 'spin'
                ? 'text-orange-500 bg-orange-500/10'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="text-xl">🎰</span>
            <div className="text-xs mt-1">Spin</div>
          </button>
          <button
            onClick={() => setActiveTab('duel')}
            className={`flex-1 py-4 text-center font-medium transition-colors ${
              activeTab === 'duel'
                ? 'text-orange-500 bg-orange-500/10'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="text-xl">⚔️</span>
            <div className="text-xs mt-1">Duel</div>
          </button>
        </div>
      </nav>
    </div>
  )
}
