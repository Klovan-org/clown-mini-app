import { useState, useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || ''

function getTgInitData() {
  try { return window.Telegram?.WebApp?.initData || '' } catch { return '' }
}
function getTgUser() {
  try { return window.Telegram?.WebApp?.initDataUnsafe?.user || null } catch { return null }
}
function showAlert(message) {
  try {
    if (window.Telegram?.WebApp?.showAlert) window.Telegram.WebApp.showAlert(message)
    else alert(message)
  } catch { alert(message) }
}

const SUIT_COLORS = { '♥️': 'text-red-500', '♦️': 'text-red-500', '♠️': 'text-gray-900', '♣️': 'text-gray-900' }

// ==================== CARD COMPONENT ====================
function Card({ rank, suit, flipped = true, small = false, highlighted = false, onClick, disabled }) {
  const sizeClass = small ? 'w-8 h-11 text-[10px]' : 'w-11 h-16 text-xs'

  if (!flipped) {
    return (
      <div className={`${sizeClass} bg-gradient-to-br from-blue-800 to-blue-900 rounded border border-blue-600 flex items-center justify-center shadow-sm`}>
        <span className="text-lg">🂠</span>
      </div>
    )
  }

  const color = SUIT_COLORS[suit] || 'text-white'

  return (
    <button
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`${sizeClass} bg-white rounded border-2 flex flex-col items-center justify-center shadow-sm transition-all
        ${highlighted ? 'border-orange-500 ring-1 ring-orange-400 scale-105' : 'border-gray-300'}
        ${onClick && !disabled ? 'hover:scale-105 cursor-pointer active:scale-95' : ''}
        ${disabled ? 'opacity-50' : ''}`}
    >
      <span className={`font-bold leading-none ${color} ${small ? 'text-[10px]' : 'text-sm'}`}>{rank || '?'}</span>
      <span className={`leading-none ${small ? 'text-[10px]' : 'text-xs'}`}>{suit || ''}</span>
    </button>
  )
}

// ==================== PYRAMID GRID ====================
function PyramidGrid({ pyramid, currentCardIndex }) {
  const rows = [
    { row: 1, cards: pyramid.filter(c => c.row === 1), drinkValue: 5 },
    { row: 2, cards: pyramid.filter(c => c.row === 2), drinkValue: 4 },
    { row: 3, cards: pyramid.filter(c => c.row === 3), drinkValue: 3 },
    { row: 4, cards: pyramid.filter(c => c.row === 4), drinkValue: 2 },
    { row: 5, cards: pyramid.filter(c => c.row === 5), drinkValue: 1 },
  ]

  return (
    <div className="flex flex-col items-center gap-1">
      {rows.map(({ row, cards, drinkValue }) => (
        <div key={row} className="flex items-center gap-0.5">
          <span className="text-gray-500 text-[10px] w-10 text-right mr-0.5">
            {drinkValue}x🍺
          </span>
          <div className="flex gap-0.5">
            {cards.map(card => (
              <Card
                key={card.index}
                rank={card.rank}
                suit={card.suit}
                flipped={card.flipped}
                small
                highlighted={card.index === currentCardIndex}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ==================== PLAYER HAND ====================
function PlayerHand({ hand, matchableCards, onSelectCard, selectedCard, disabled }) {
  const isMatchable = (card) => {
    return matchableCards?.some(m => m.rank === card.rank && m.suit === card.suit)
  }

  const isSelected = (card) => {
    return selectedCard && selectedCard.rank === card.rank && selectedCard.suit === card.suit
  }

  return (
    <div className="flex flex-wrap gap-1 justify-center">
      {hand.map((card, i) => (
        <Card
          key={`${card.rank}${card.suit}-${i}`}
          rank={card.rank}
          suit={card.suit}
          highlighted={isMatchable(card) || isSelected(card)}
          onClick={isMatchable(card) ? () => onSelectCard(card) : undefined}
          disabled={disabled}
        />
      ))}
      {hand.length === 0 && (
        <div className="text-gray-500 text-xs py-2">Nemas karata u ruci!</div>
      )}
    </div>
  )
}

// ==================== PLAYER LIST (compact) ====================
function PlayerList({ players, myId, busPlayerId, showDrinks = true }) {
  return (
    <div className="flex flex-wrap gap-1">
      {players.map(p => {
        const isMe = String(p.user_id) === String(myId)
        const isBus = String(p.user_id) === String(busPlayerId)
        const name = p.first_name || p.username || 'Klovn'
        return (
          <div key={p.user_id}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${
              p.is_match_turn ? 'bg-orange-900/30 border-orange-600' :
              isMe ? 'bg-gray-700/80 border-gray-600' : 'bg-gray-700/40 border-gray-700'
            }`}>
            <span className="text-white font-medium truncate max-w-[80px]">
              {isBus ? '🚌' : ''}{name}
            </span>
            {isMe && <span className="text-orange-400 text-[10px]">TI</span>}
            {p.is_match_turn && <span className="text-orange-400 text-[10px] animate-pulse">▶</span>}
            <span className="text-gray-400">🃏{p.hand_count}</span>
            {showDrinks && <span className="text-orange-400">🍺{p.drinks_received}</span>}
          </div>
        )
      })}
    </div>
  )
}

// ==================== BUS PROGRESS ====================
function BusProgress({ progress, maxProgress = 5 }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: maxProgress }).map((_, i) => (
        <div key={i}
          className={`w-7 h-7 rounded flex items-center justify-center font-bold text-xs border ${
            i < progress
              ? 'bg-green-600 border-green-500 text-white'
              : 'bg-gray-700 border-gray-600 text-gray-500'
          }`}>
          {i < progress ? '✅' : i + 1}
        </div>
      ))}
    </div>
  )
}

// ==================== MAIN AUTOBUS TAB ====================
export default function AutobusTab() {
  const [view, setView] = useState('lobby') // lobby | game
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [lobbyData, setLobbyData] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [activeGameId, setActiveGameId] = useState(null)
  const [selectedCard, setSelectedCard] = useState(null)
  const [selectedTarget, setSelectedTarget] = useState('')
  const [lastFlavor, setLastFlavor] = useState(null)

  const tgUser = getTgUser()
  const initData = getTgInitData()

  // ==================== FETCH LOBBY ====================
  const fetchLobby = useCallback(async () => {
    if (!initData) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/autobus?op=lobby`, {
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

  // ==================== FETCH GAME STATE ====================
  const fetchGameState = useCallback(async (gameId) => {
    if (!initData || !gameId) return
    try {
      const res = await fetch(`${API_BASE}/api/autobus?op=state&id=${gameId}`, {
        headers: { 'x-telegram-init-data': initData }
      })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setGameState(data)
    } catch (err) {
      console.error('Game state fetch error:', err)
    }
  }, [initData])

  useEffect(() => {
    if (view === 'lobby') fetchLobby()
  }, [view, fetchLobby])

  // Game polling - only during active gameplay
  useEffect(() => {
    if (view !== 'game' || !activeGameId || !gameState) return
    if (gameState.game.status !== 'active') return

    const isBusPhase = gameState.game.current_phase === 'bus'
    const isMyTurn = gameState.is_my_match_turn || gameState.is_bus_player
    if (isMyTurn) return // Don't poll when it's my turn

    const interval = 500
    const timer = setInterval(() => fetchGameState(activeGameId), interval)
    return () => clearInterval(timer)
  }, [view, activeGameId, gameState, fetchGameState])

  // ==================== ACTIONS ====================
  const handleCreate = async () => {
    if (!initData) return
    setActing(true)
    try {
      const res = await fetch(`${API_BASE}/api/autobus?op=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData }
      })
      const data = await res.json()
      if (!res.ok) { showAlert(data.error || 'Greska'); return }
      showAlert('Igra kreirana! Cekaj da se igraci prikljuce.')
      fetchLobby()
    } catch (err) {
      showAlert('Greska pri kreiranju igre')
    } finally {
      setActing(false)
    }
  }

  const handleJoin = async (gameId) => {
    if (!initData) return
    setActing(true)
    try {
      const res = await fetch(`${API_BASE}/api/autobus?op=join&id=${gameId}`, {
        method: 'POST',
        headers: { 'x-telegram-init-data': initData }
      })
      const data = await res.json()
      if (!res.ok) { showAlert(data.error || 'Greska'); return }
      fetchLobby()
    } catch (err) {
      showAlert('Greska pri pridruzivanju')
    } finally {
      setActing(false)
    }
  }

  const handleStart = async (gameId) => {
    if (!initData) return
    setActing(true)
    try {
      const res = await fetch(`${API_BASE}/api/autobus?op=start&id=${gameId}`, {
        method: 'POST',
        headers: { 'x-telegram-init-data': initData }
      })
      const data = await res.json()
      if (!res.ok) { showAlert(data.error || 'Greska'); return }
      setActiveGameId(gameId)
      setLastFlavor(null)
      setSelectedCard(null)
      setSelectedTarget('')
      await fetchGameState(gameId)
      setView('game')
    } catch (err) {
      showAlert('Greska pri pokretanju')
    } finally {
      setActing(false)
    }
  }

  const handleOpenGame = async (gameId) => {
    setActiveGameId(gameId)
    setLastFlavor(null)
    setSelectedCard(null)
    setSelectedTarget('')
    await fetchGameState(gameId)
    setView('game')
  }

  const handleFlip = async () => {
    if (!initData || !activeGameId || acting) return
    setActing(true)
    try {
      const res = await fetch(`${API_BASE}/api/autobus?op=flip&id=${activeGameId}`, {
        method: 'POST',
        headers: { 'x-telegram-init-data': initData }
      })
      const data = await res.json()
      if (!res.ok) { showAlert(data.error || 'Greska'); return }
      // Optimistic: immediately update pyramid card as flipped
      if (data.ok && data.card && gameState) {
        setGameState(prev => {
          if (!prev) return prev
          const nextIndex = prev.game.current_card_index + 1
          const newPyramid = prev.pyramid.map((c, i) =>
            i === nextIndex ? { ...c, flipped: true, rank: data.card.rank, suit: data.card.suit } : c
          )
          return {
            ...prev,
            game: { ...prev.game, current_card_index: nextIndex, matching_done: false, match_turn_index: 0 },
            pyramid: newPyramid,
            current_flipped_card: { rank: data.card.rank, suit: data.card.suit, index: nextIndex, drinkValue: data.drink_value },
            needs_flip: false,
          }
        })
      }
      setLastFlavor(`Okrenuta: ${data.card.rank}${data.card.suit} (${data.drink_value} cugova)`)
      setSelectedCard(null)
      setSelectedTarget('')
      setActing(false)
      // Background sync
      fetchGameState(activeGameId)
    } catch (err) {
      showAlert('Greska pri okretanju karte')
      setActing(false)
    }
  }

  const handleMatch = async () => {
    if (!initData || !activeGameId || !selectedCard || !selectedTarget || acting) return
    setActing(true)
    try {
      const res = await fetch(`${API_BASE}/api/autobus?op=match&id=${activeGameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData },
        body: JSON.stringify({ card: selectedCard, target_user_id: selectedTarget })
      })
      const data = await res.json()
      if (!res.ok) { showAlert(data.error || 'Greska'); return }
      // Optimistic: remove card from hand
      if (gameState) {
        const cardToRemove = selectedCard
        setGameState(prev => {
          if (!prev) return prev
          const newHand = prev.my_hand.filter(c => !(c.rank === cardToRemove.rank && c.suit === cardToRemove.suit))
          return { ...prev, my_hand: newHand, is_my_match_turn: false, can_match: false, matchable_cards: [] }
        })
      }
      setLastFlavor(`Match! Dao si ${data.drinks_given} cug(ova)! Ostalo ti ${data.cards_left} karata.`)
      setSelectedCard(null)
      setSelectedTarget('')
      setActing(false)
      fetchGameState(activeGameId)
    } catch (err) {
      showAlert('Greska pri matchovanju')
      setActing(false)
    }
  }

  const handlePass = async () => {
    if (!initData || !activeGameId || acting) return
    setActing(true)
    try {
      const res = await fetch(`${API_BASE}/api/autobus?op=pass&id=${activeGameId}`, {
        method: 'POST',
        headers: { 'x-telegram-init-data': initData }
      })
      const data = await res.json()
      if (!res.ok) { showAlert(data.error || 'Greska'); return }
      // Optimistic: no longer my turn
      setGameState(prev => prev ? { ...prev, is_my_match_turn: false, can_match: false, matchable_cards: [] } : prev)
      setSelectedCard(null)
      setSelectedTarget('')
      setActing(false)
      fetchGameState(activeGameId)
    } catch (err) {
      showAlert('Greska')
      setActing(false)
    }
  }

  const handleBusGuess = async (guess) => {
    if (!initData || !activeGameId || acting) return
    setActing(true)
    try {
      const res = await fetch(`${API_BASE}/api/autobus?op=bus_guess&id=${activeGameId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': initData },
        body: JSON.stringify({ guess })
      })
      const data = await res.json()
      if (!res.ok) { showAlert(data.error || 'Greska'); return }
      // Optimistic: update bus card and progress
      if (data.new_card && gameState) {
        setGameState(prev => {
          if (!prev) return prev
          return {
            ...prev,
            game: { ...prev.game, bus_current_card: data.new_card, bus_progress: data.bus_progress }
          }
        })
      }
      setLastFlavor(data.flavor_text)
      setActing(false)
      fetchGameState(activeGameId)
    } catch (err) {
      showAlert('Greska pri pogadjanju')
      setActing(false)
    }
  }

  const getName = (p) => p?.first_name || p?.username || 'Klovn'

  // ==================== LOADING ====================
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

  // ==================== GAME VIEW ====================
  if (view === 'game' && gameState) {
    const g = gameState.game
    const isFinished = g.status === 'finished'
    const isPyramid = g.current_phase === 'pyramid'
    const isBus = g.current_phase === 'bus'
    const myId = String(gameState.my_id)

    // ===== FINISHED VIEW =====
    if (isFinished) {
      return (
        <div className="max-w-md mx-auto p-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => { setView('lobby'); fetchLobby() }}
              className="text-gray-400 hover:text-white text-sm">← Nazad</button>
            <h3 className="text-white font-semibold text-sm">🚌 Klovn Autobus</h3>
            <div />
          </div>

          <div className="text-center py-4 bg-gradient-to-r from-orange-500/20 to-orange-600/20 rounded-xl border border-orange-500/50 mb-2">
            <div className="text-3xl mb-1">🎉🚌🎉</div>
            <div className="text-orange-400 font-bold">Igra zavrsena!</div>
          </div>

          <div className="bg-gray-800/80 rounded-xl p-3 border border-gray-700 mb-2">
            <h4 className="text-gray-300 font-semibold text-xs mb-1.5">🍺 Rezultati</h4>
            <PlayerList players={gameState.players} myId={myId} busPlayerId={g.bus_player_id} />
          </div>

          {gameState.recent_log?.length > 0 && (
            <div className="bg-gray-800/80 rounded-xl p-3 border border-gray-700">
              <h4 className="text-gray-400 text-xs font-semibold mb-1">Poslednje akcije</h4>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {gameState.recent_log.slice(0, 8).map((entry, i) => (
                  <div key={i} className="text-[10px] px-2 py-1 bg-gray-700/30 rounded text-gray-300">
                    {entry.flavor_text || entry.action_type}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => { setView('lobby'); fetchLobby() }}
            className="mt-2 w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold text-sm">
            Nazad u lobi
          </button>
        </div>
      )
    }

    // ===== BUS PHASE VIEW =====
    if (isBus) {
      const busPlayerInfo = gameState.players.find(p => String(p.user_id) === String(g.bus_player_id))
      const busPlayerName = busPlayerInfo ? getName(busPlayerInfo) : 'Klovn'
      const isMeBus = gameState.is_bus_player

      return (
        <div className="max-w-md mx-auto p-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => { setView('lobby'); fetchLobby() }}
              className="text-gray-400 hover:text-white text-sm">← Nazad</button>
            <h3 className="text-white font-semibold text-sm">🚌 Autobus</h3>
            <button onClick={() => fetchGameState(activeGameId)}
              className="text-gray-400 hover:text-white text-sm">🔄</button>
          </div>

          {/* Bus header + current card inline */}
          <div className={`rounded-xl p-3 border mb-2 ${
            isMeBus ? 'bg-red-900/30 border-red-700' : 'bg-gray-800/80 border-gray-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-white font-bold text-sm">
                  🚌 {isMeBus ? 'TI si u autobusu!' : `${busPlayerName}`}
                </div>
                {isMeBus && g.bus_progress > 0 && (
                  <div className="text-red-400 text-[10px] mt-0.5">
                    Promasaj = {g.bus_progress} cug(ova) 🍺
                  </div>
                )}
              </div>
              {g.bus_current_card && (
                <Card rank={g.bus_current_card.rank} suit={g.bus_current_card.suit} />
              )}
            </div>
            <BusProgress progress={g.bus_progress} />
          </div>

          {/* Guess buttons (only for bus player) */}
          {isMeBus && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button onClick={() => handleBusGuess('higher')} disabled={acting}
                className="py-3 rounded-xl font-bold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-600 text-white transition-all shadow-lg">
                🔺 Veca
              </button>
              <button onClick={() => handleBusGuess('lower')} disabled={acting}
                className="py-3 rounded-xl font-bold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-600 text-white transition-all shadow-lg">
                🔻 Manja
              </button>
            </div>
          )}

          {/* Waiting message for spectators */}
          {!isMeBus && (
            <div className="text-center py-3 mb-2">
              <div className="text-xl mb-1 animate-bounce">⏳</div>
              <div className="text-gray-400 text-xs">Cekas {busPlayerName} da pogadja...</div>
            </div>
          )}

          {/* Last action */}
          {lastFlavor && (
            <div className="bg-gray-700/50 rounded-lg p-2 mb-2 border border-gray-600 text-center">
              <p className="text-orange-300 text-xs italic">"{lastFlavor}"</p>
            </div>
          )}

          {/* Players */}
          <div className="bg-gray-800/80 rounded-xl p-3 border border-gray-700 mb-2">
            <h4 className="text-gray-400 text-xs font-semibold mb-1.5">Igraci</h4>
            <PlayerList players={gameState.players} myId={myId} busPlayerId={g.bus_player_id} />
          </div>

          {/* Recent log - compact */}
          {gameState.recent_log?.length > 0 && (
            <div className="space-y-0.5">
              {gameState.recent_log.slice(0, 3).map((entry, i) => (
                <div key={i} className="text-[10px] px-2 py-1 bg-gray-700/30 rounded text-gray-400">
                  {entry.flavor_text || entry.action_type}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // ===== PYRAMID PHASE VIEW =====
    return (
      <div className="max-w-md mx-auto p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => { setView('lobby'); fetchLobby() }}
            className="text-gray-400 hover:text-white text-sm">← Nazad</button>
          <h3 className="text-white font-semibold text-sm">🚌 Piramida {Math.max(0, g.current_card_index + 1)}/15</h3>
          <button onClick={() => fetchGameState(activeGameId)}
            className="text-gray-400 hover:text-white text-sm">🔄</button>
        </div>

        {/* Pyramid + current flipped card side by side */}
        <div className="bg-gray-800/80 rounded-xl p-2.5 border border-gray-700 mb-2">
          <div className="flex gap-3">
            <div className="flex-1">
              <PyramidGrid pyramid={gameState.pyramid} currentCardIndex={g.current_card_index} />
            </div>
            {gameState.current_flipped_card && (
              <div className="flex flex-col items-center justify-center gap-1 px-2">
                <div className="text-gray-500 text-[10px]">Otvorena</div>
                <Card rank={gameState.current_flipped_card.rank} suit={gameState.current_flipped_card.suit} />
                <div className="text-orange-400 text-[10px] font-bold">
                  {gameState.current_flipped_card.drinkValue}x🍺
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Flip button */}
        {gameState.needs_flip && (
          <button onClick={handleFlip} disabled={acting}
            className="w-full py-2.5 mb-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg">
            {acting ? 'Okrecemo...' : '🃏 Okreni sledecu kartu'}
          </button>
        )}

        {/* My hand */}
        <div className="bg-gray-800/80 rounded-xl p-2.5 border border-gray-700 mb-2">
          <div className="flex justify-between items-center mb-1.5">
            <h4 className="text-gray-300 text-xs font-semibold">🃏 Tvoja ruka ({gameState.my_hand.length})</h4>
            {gameState.is_my_match_turn && (
              <span className="text-orange-400 text-[10px] animate-pulse font-bold">Tvoj red!</span>
            )}
          </div>
          <PlayerHand
            hand={gameState.my_hand}
            matchableCards={gameState.can_match ? gameState.matchable_cards : []}
            onSelectCard={setSelectedCard}
            selectedCard={selectedCard}
            disabled={!gameState.is_my_match_turn || acting}
          />

          {/* Match controls */}
          {gameState.is_my_match_turn && gameState.current_flipped_card && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              {selectedCard ? (
                <div className="space-y-1.5">
                  <div className="text-gray-400 text-[10px]">
                    Izabrana: {selectedCard.rank}{selectedCard.suit} — Daj pice:
                  </div>
                  <select
                    value={selectedTarget}
                    onChange={e => setSelectedTarget(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-orange-500"
                  >
                    <option value="">-- Izaberi igraca --</option>
                    {gameState.players
                      .map(p => (
                        <option key={p.user_id} value={String(p.user_id)}>
                          {getName(p)} (🍺 {p.drinks_received})
                        </option>
                      ))}
                  </select>
                  <div className="flex gap-1.5">
                    <button onClick={handleMatch}
                      disabled={!selectedTarget || acting}
                      className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium text-xs transition-colors">
                      ✅ Match
                    </button>
                    <button onClick={() => { setSelectedCard(null); setSelectedTarget('') }}
                      className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-xs transition-colors">
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  {gameState.can_match && (
                    <div className="text-orange-400 text-[10px] flex-1">
                      Imas match! Klikni kartu.
                    </div>
                  )}
                  <button onClick={handlePass} disabled={acting}
                    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white rounded-lg text-xs font-medium transition-colors">
                    Dalje (Pass)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Waiting for others to match */}
          {!gameState.is_my_match_turn && !gameState.needs_flip && gameState.current_flipped_card && (
            <div className="mt-2 pt-2 border-t border-gray-700 text-center">
              <div className="text-gray-500 text-[10px]">
                Cekas da drugi igraci match-uju ili pass-uju...
              </div>
            </div>
          )}
        </div>

        {/* Last action */}
        {lastFlavor && (
          <div className="bg-gray-700/50 rounded-lg p-2 mb-2 border border-gray-600 text-center">
            <p className="text-orange-300 text-xs italic">"{lastFlavor}"</p>
          </div>
        )}

        {/* Players inline */}
        <div className="bg-gray-800/80 rounded-xl p-2.5 border border-gray-700">
          <PlayerList players={gameState.players} myId={myId} />
        </div>
      </div>
    )
  }

  // ==================== LOBBY VIEW ====================
  const myId = lobbyData?.my_id ? String(lobbyData.my_id) : String(tgUser?.id)
  const myGames = lobbyData?.my_games || []
  const openGames = lobbyData?.open_games || []
  const recentFinished = lobbyData?.recent_finished || []

  return (
    <div className="max-w-md mx-auto p-3">
      {/* Header */}
      <div className="bg-gray-800/80 rounded-xl p-3 border border-gray-700 shadow-lg mb-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">🚌 Klovn Autobus</h3>
            <p className="text-gray-400 text-xs">Drinking card game za 2-8 igraca!</p>
          </div>
          <button onClick={fetchLobby} disabled={loading}
            className="text-xl hover:scale-110 transition-transform disabled:opacity-50">
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : '🔄'}
          </button>
        </div>
      </div>

      {/* Create new game */}
      <button onClick={handleCreate} disabled={acting}
        className="w-full py-2.5 mb-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg hover:shadow-orange-500/25">
        {acting ? 'Kreiranje...' : '🎮 Kreiraj novu igru'}
      </button>

      {/* My active games */}
      {myGames.length > 0 && (
        <div className="bg-gray-800/80 rounded-xl p-3 border border-gray-700 mb-2">
          <h4 className="text-green-400 font-semibold text-xs mb-1.5">🎮 Moje igre</h4>
          {myGames.map(game => {
            const isLobby = game.status === 'lobby'
            const isCreator = String(game.created_by) === myId
            const playerNames = (game.players || []).map(p => p.first_name || p.username || 'Klovn').join(', ')

            return (
              <div key={game.id} className="bg-gray-700/50 rounded-lg p-2.5 mb-1 border border-gray-600">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-white text-xs font-medium">
                    {isLobby ? '⏳ Cekanje' : game.current_phase === 'bus' ? '🚌 Autobus' : '🔺 Piramida'}
                  </span>
                  <span className="text-gray-400 text-[10px]">
                    {(game.players || []).length} igraca
                  </span>
                </div>
                <div className="text-gray-400 text-[10px] mb-1.5 truncate">{playerNames}</div>
                <div className="flex gap-2">
                  {isLobby && isCreator && (game.players || []).length >= 1 && (
                    <button onClick={() => handleStart(game.id)} disabled={acting}
                      className="flex-1 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-medium">
                      ▶️ Pokreni
                    </button>
                  )}
                  {!isLobby && (
                    <button onClick={() => handleOpenGame(game.id)}
                      className="flex-1 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded-lg font-medium">
                      Otvori →
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Open games to join */}
      {openGames.length > 0 && (
        <div className="bg-gray-800/80 rounded-xl p-3 border border-gray-700 mb-2">
          <h4 className="text-yellow-400 font-semibold text-xs mb-1.5">📨 Otvorene igre</h4>
          {openGames.map(game => {
            const creatorName = game.creator_name || game.creator_username || 'Klovn'
            return (
              <div key={game.id} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-2.5 mb-1">
                <div>
                  <span className="text-white text-xs">{creatorName}</span>
                  <span className="text-gray-400 text-[10px] ml-1.5">{game.player_count}/8</span>
                </div>
                <button onClick={() => handleJoin(game.id)} disabled={acting}
                  className="px-2.5 py-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-600 text-white text-[10px] rounded-lg font-medium">
                  Pridruzi se
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent finished */}
      {recentFinished.length > 0 && (
        <div className="bg-gray-800/80 rounded-xl p-3 border border-gray-700">
          <h4 className="text-gray-400 font-semibold text-xs mb-1.5">🏁 Zavrsene igre</h4>
          {recentFinished.map(game => (
            <div key={game.id} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-2 mb-1">
              <span className="text-gray-300 text-xs">Igra #{game.id}</span>
              <span className="text-gray-500 text-[10px]">Zavrsena</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {myGames.length === 0 && openGames.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <div className="text-3xl mb-1">🚌</div>
          <p className="text-sm">Nema aktivnih igara. Kreiraj novu!</p>
        </div>
      )}
    </div>
  )
}
