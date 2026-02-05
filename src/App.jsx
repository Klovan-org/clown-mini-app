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
    setIsSpinning(true)

    const totalSteps = 20 + Math.floor(Math.random() * 15)
    let step = 0
    let current = 0

    const interval = setInterval(() => {
      current = (current + 1) % names.length
      setHighlightIndex(current)
      step++

      if (step >= totalSteps) {
        clearInterval(interval)
        setHighlightIndex(-1)
        setSelectedName(names[current])
        setIsSpinning(false)
      }
    }, 60 + step * 8)
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

// Duel tab component - clown vs clown battle
function DuelTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [fighter1, setFighter1] = useState('')
  const [fighter2, setFighter2] = useState('')
  const [battleState, setBattleState] = useState('idle') // idle | fighting | done
  const [winner, setWinner] = useState(null)
  const [battleLog, setBattleLog] = useState([])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/users`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      console.error('Fetch users error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const user1 = users.find(u => String(u.telegram_id) === fighter1)
  const user2 = users.find(u => String(u.telegram_id) === fighter2)

  const getName = (user) => user?.clown_name || user?.first_name || user?.username || 'Klovn'

  const attacks = [
    'baca tortu u lice',
    'prska vodom iz cveta',
    'gazi ogromnom cipelom',
    'trubi crvenim nosom',
    'zaplice se u sopstvene pantalone',
    'izvlaci beskonacnu maramu',
    'pravi balon zivotinju kao oruzje',
    'udara gumenom kokoskom',
    'pusta konfete iz rukava',
    'radi kolut napred i padne',
  ]

  const handleRandomPick = () => {
    if (users.length < 2) return
    const shuffled = [...users].sort(() => Math.random() - 0.5)
    setFighter1(String(shuffled[0].telegram_id))
    setFighter2(String(shuffled[1].telegram_id))
    setBattleState('idle')
    setWinner(null)
    setBattleLog([])
  }

  const handleFight = () => {
    if (!user1 || !user2) {
      showAlert('Izaberi oba klovna!')
      return
    }
    if (fighter1 === fighter2) {
      showAlert('Klovn ne moze da se bori sam sa sobom!')
      return
    }

    setBattleState('fighting')
    setWinner(null)
    setBattleLog([])

    const rounds = 3
    const log = []
    let score1 = 0
    let score2 = 0

    for (let i = 0; i < rounds; i++) {
      const atk1 = attacks[Math.floor(Math.random() * attacks.length)]
      const atk2 = attacks[Math.floor(Math.random() * attacks.length)]
      const power1 = (user1.level ?? 0) + Math.random() * 6
      const power2 = (user2.level ?? 0) + Math.random() * 6

      log.push({ round: i + 1, name: getName(user1), attack: atk1, power: power1.toFixed(1) })
      log.push({ round: i + 1, name: getName(user2), attack: atk2, power: power2.toFixed(1) })

      if (power1 >= power2) score1++
      else score2++
    }

    let step = 0
    const interval = setInterval(() => {
      if (step < log.length) {
        setBattleLog(prev => [...prev, log[step]])
        step++
      } else {
        clearInterval(interval)
        const finalWinner = score1 > score2 ? user1 : score2 > score1 ? user2 : (Math.random() > 0.5 ? user1 : user2)
        setWinner(finalWinner)
        setBattleState('done')
      }
    }, 600)
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
        <h3 className="text-lg font-semibold text-white mb-1">⚔️ Clown Duel</h3>
        <p className="text-gray-400 text-sm mb-4">Izaberi dva klovna i pusti ih da se bore!</p>

        {/* Fighter selectors */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center mb-4">
          <div>
            <label className="block text-gray-400 text-xs mb-1">Borac 1</label>
            <select
              value={fighter1}
              onChange={(e) => { setFighter1(e.target.value); setBattleState('idle'); setWinner(null); setBattleLog([]) }}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors appearance-none"
            >
              <option value="">-- Izaberi --</option>
              {users.map(u => (
                <option key={u.telegram_id} value={String(u.telegram_id)}>
                  {getName(u)} Lv.{u.level ?? 0}
                </option>
              ))}
            </select>
          </div>

          <div className="text-2xl text-orange-500 font-bold pt-5">VS</div>

          <div>
            <label className="block text-gray-400 text-xs mb-1">Borac 2</label>
            <select
              value={fighter2}
              onChange={(e) => { setFighter2(e.target.value); setBattleState('idle'); setWinner(null); setBattleLog([]) }}
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors appearance-none"
            >
              <option value="">-- Izaberi --</option>
              {users.map(u => (
                <option key={u.telegram_id} value={String(u.telegram_id)}>
                  {getName(u)} Lv.{u.level ?? 0}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fighter preview */}
        {user1 && user2 && fighter1 !== fighter2 && (
          <div className="flex items-center justify-around mb-4 p-4 bg-gray-700/50 rounded-xl border border-gray-600">
            <div className="text-center">
              <ClownImage level={user1.level ?? 0} size="lg" />
              <div className="text-white font-medium text-sm mt-2">{getName(user1)}</div>
              <div className="text-orange-400 text-xs">Lv.{user1.level ?? 0}</div>
            </div>
            <div className={`text-3xl ${battleState === 'fighting' ? 'animate-bounce' : ''}`}>⚔️</div>
            <div className="text-center">
              <ClownImage level={user2.level ?? 0} size="lg" />
              <div className="text-white font-medium text-sm mt-2">{getName(user2)}</div>
              <div className="text-orange-400 text-xs">Lv.{user2.level ?? 0}</div>
            </div>
          </div>
        )}

        {/* Battle log */}
        {battleLog.length > 0 && (
          <div className="mb-4 space-y-1 max-h-48 overflow-y-auto">
            {battleLog.map((entry, i) => (
              <div key={i} className="text-sm px-3 py-1.5 bg-gray-700/30 rounded-lg">
                <span className="text-orange-400">R{entry.round}</span>
                {' '}
                <span className="text-white font-medium">{entry.name}</span>
                {' '}
                <span className="text-gray-400">{entry.attack}</span>
                {' '}
                <span className="text-orange-300">({entry.power})</span>
              </div>
            ))}
          </div>
        )}

        {/* Winner */}
        {winner && battleState === 'done' && (
          <div className="text-center py-4 mb-4 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-xl border border-orange-500/50">
            <div className="text-3xl mb-1">🏆🤡🏆</div>
            <div className="text-orange-400 text-sm">Pobednik duela:</div>
            <div className="text-white text-2xl font-bold mt-1">{getName(winner)}</div>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleFight}
            disabled={battleState === 'fighting' || !fighter1 || !fighter2 || fighter1 === fighter2}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              battleState === 'fighting'
                ? 'bg-red-600 animate-pulse text-white'
                : !fighter1 || !fighter2 || fighter1 === fighter2
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white shadow-lg hover:shadow-red-500/25'
            }`}
          >
            {battleState === 'fighting' ? '⚔️ Bore se...' : '⚔️ BORBA!'}
          </button>

          <button
            onClick={handleRandomPick}
            disabled={battleState === 'fighting' || users.length < 2}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 transition-all border border-gray-600 disabled:cursor-not-allowed"
          >
            🎲 Nasumicni borci
          </button>
        </div>
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
