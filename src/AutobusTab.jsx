import { useState, useEffect, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

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

// Inject fadeIn animation
if (typeof document !== 'undefined' && !document.getElementById('toast-anim')) {
  const style = document.createElement('style')
  style.id = 'toast-anim'
  style.textContent = '@keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}'
  document.head.appendChild(style)
}

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
        const isMe = String(p.id) === String(myId)
        const isBus = String(p.id) === String(busPlayerId)
        return (
          <div key={p.id}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs ${
              p.isMatchTurn ? 'bg-orange-900/30 border-orange-600' :
              isMe ? 'bg-gray-700/80 border-gray-600' : 'bg-gray-700/40 border-gray-700'
            }`}>
            <span className="text-white font-medium truncate max-w-[80px]">
              {isBus ? '🚌' : ''}{p.name}
            </span>
            {isMe && <span className="text-orange-400 text-[10px]">TI</span>}
            {p.isMatchTurn && <span className="text-orange-400 text-[10px] animate-pulse">▶</span>}
            {!p.connected && <span className="text-red-400 text-[10px]">⚡</span>}
            <span className="text-gray-400">🃏{p.handCount}</span>
            {showDrinks && <span className="text-orange-400">🍺{p.drinks}</span>}
          </div>
        )
      })}
    </div>
  )
}

// ==================== TOAST NOTIFICATION ====================
function Toast({ toast }) {
  if (!toast) return null
  const bgColor = toast.type === 'match' ? 'from-orange-600 to-orange-700'
    : toast.type === 'bus_correct' ? 'from-green-600 to-green-700'
    : toast.type === 'bus_wrong' ? 'from-red-600 to-red-700'
    : 'from-gray-600 to-gray-700'

  return (
    <div key={toast.key} className={`bg-gradient-to-r ${bgColor} rounded-lg px-3 py-2 mb-2 text-center shadow-lg animate-[fadeIn_0.2s_ease-out]`}>
      <p className="text-white text-sm font-semibold">{toast.text}</p>
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
  const [connected, setConnected] = useState(false)
  const [acting, setActing] = useState(false)
  const [lobbyGames, setLobbyGames] = useState([])
  const [gameState, setGameState] = useState(null)
  const [activeGameId, setActiveGameId] = useState(null)
  const [selectedCard, setSelectedCard] = useState(null)
  const [toast, setToast] = useState(null)

  const socketRef = useRef(null)
  const lastLogTimeRef = useRef(0)
  const toastTimerRef = useRef(null)
  const tgUser = getTgUser()
  const playerId = String(tgUser?.id || 'dev_' + Math.random().toString(36).slice(2, 6))
  const playerName = tgUser?.first_name || tgUser?.username || 'Klovn'

  // ==================== SOCKET CONNECTION ====================
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 20,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id)
      setConnected(true)
      socket.emit('identify', { playerId, playerName })
    })

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
      setConnected(false)
    })

    socket.on('gameState', (state) => {
      setGameState(state)
      setActiveGameId(state.game.id)
      setView('game')
    })

    socket.on('playerJoined', (data) => {
      console.log('[Socket] Player joined:', data.playerName)
      // Refresh lobby
      socket.emit('listGames', (res) => {
        if (res?.ok) setLobbyGames(res.games)
      })
    })

    socket.on('playerLeft', (data) => {
      console.log('[Socket] Player left:', data.playerId)
    })

    socket.on('gameEnded', (data) => {
      console.log('[Socket] Game ended:', data.reason)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  // ==================== TOAST FROM LOG ====================
  useEffect(() => {
    const log = gameState?.recentLog || []
    if (log.length === 0) return

    const lastTime = lastLogTimeRef.current
    // Update ref to latest time
    const newestTime = log[log.length - 1]?.time || 0
    if (newestTime <= lastTime) return
    lastLogTimeRef.current = newestTime

    // Scan new entries backwards, find the most important toast-worthy one
    const TOAST_TYPES = ['match', 'bus_guess', 'bus_start', 'bus_exit', 'game_end']
    let toastEntry = null
    for (let i = log.length - 1; i >= 0; i--) {
      const entry = log[i]
      if (!entry.time || entry.time <= lastTime) break
      if (TOAST_TYPES.includes(entry.type)) { toastEntry = entry; break }
    }

    if (!toastEntry) return

    const toastType = toastEntry.type === 'match' ? 'match'
      : toastEntry.type === 'bus_guess' && toastEntry.text.includes('✅') ? 'bus_correct'
      : toastEntry.type === 'bus_guess' ? 'bus_wrong'
      : 'info'

    setToast({ text: toastEntry.text, type: toastType, key: toastEntry.time })
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 3500)
  }, [gameState])

  // ==================== FETCH LOBBY ====================
  const fetchLobby = useCallback(() => {
    const socket = socketRef.current
    if (!socket?.connected) return
    socket.emit('listGames', (res) => {
      if (res?.ok) setLobbyGames(res.games)
    })
  }, [])

  useEffect(() => {
    if (view === 'lobby' && connected) fetchLobby()
  }, [view, connected, fetchLobby])

  // Auto-refresh lobby every 3s
  useEffect(() => {
    if (view !== 'lobby' || !connected) return
    const timer = setInterval(fetchLobby, 3000)
    return () => clearInterval(timer)
  }, [view, connected, fetchLobby])

  // ==================== ACTIONS ====================
  const emit = (event, dataOrCallback, callback) => {
    const socket = socketRef.current
    if (!socket?.connected) { showAlert('Nisi povezan sa serverom'); return }
    if (typeof dataOrCallback === 'function') {
      socket.emit(event, dataOrCallback)
    } else {
      socket.emit(event, dataOrCallback, callback)
    }
  }

  const handleCreate = () => {
    setActing(true)
    emit('createGame', (res) => {
      setActing(false)
      if (res?.error) { showAlert(res.error); return }
      setActiveGameId(res.gameId)
      setToast(null)
      setSelectedCard(null)
      setView('game')
    })
  }

  const handleJoin = (gameId) => {
    setActing(true)
    emit('joinGame', { gameId }, (res) => {
      setActing(false)
      if (res?.error) { showAlert(res.error); return }
      setActiveGameId(gameId)
      setToast(null)
      setSelectedCard(null)
      setView('game')
    })
  }

  const handleStart = (gameId) => {
    setActing(true)
    emit('startGame', { gameId }, (res) => {
      setActing(false)
      if (res?.error) { showAlert(res.error); return }
    })
  }

  const handleFlip = () => {
    if (acting) return
    setActing(true)
    emit('flipCard', (res) => {
      setActing(false)
      if (res?.error) { showAlert(res.error); return }
      setSelectedCard(null)
    })
  }

  const handleMatch = (targetId) => {
    if (!selectedCard || !targetId || acting) return
    setActing(true)
    emit('matchCard', { card: selectedCard, targetPlayerId: targetId }, (res) => {
      setActing(false)
      if (res?.error) { showAlert(res.error); return }
      setSelectedCard(null)
    })
  }

  const handlePass = () => {
    if (acting) return
    setActing(true)
    emit('passCard', (res) => {
      setActing(false)
      if (res?.error) { showAlert(res.error); return }
      setSelectedCard(null)
    })
  }

  const handleBusGuess = (guess) => {
    if (acting) return
    setActing(true)
    emit('busGuess', { guess }, (res) => {
      setActing(false)
      if (res?.error) { showAlert(res.error); return }
    })
  }

  const handleLeave = () => {
    emit('leaveGame', () => {
      setGameState(null)
      setActiveGameId(null)
      setView('lobby')
      fetchLobby()
    })
  }

  const getName = (p) => p?.name || 'Klovn'

  // ==================== CONNECTION STATUS ====================
  if (!connected) {
    return (
      <div className="flex flex-col justify-center items-center py-24 gap-3">
        <svg className="animate-spin h-8 w-8 text-orange-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <div className="text-gray-400 text-xs">Povezivanje na server...</div>
      </div>
    )
  }

  // ==================== GAME VIEW ====================
  if (view === 'game' && gameState) {
    const g = gameState.game
    const isFinished = g.state === 'finished'
    const isPyramid = g.state === 'pyramid'
    const isBus = g.state === 'bus'
    const isLobby = g.state === 'lobby'
    const myId = String(gameState.myId)

    // ===== LOBBY (waiting for players) =====
    if (isLobby) {
      const isCreator = g.createdBy === playerId
      return (
        <div className="max-w-md mx-auto p-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={handleLeave}
              className="text-gray-400 hover:text-white text-sm">← Nazad</button>
            <h3 className="text-white font-semibold text-sm">🚌 Soba {g.id}</h3>
            <div />
          </div>

          <div className="bg-gray-800/80 rounded-xl p-4 border border-gray-700 mb-2 text-center">
            <div className="text-2xl mb-2">⏳</div>
            <div className="text-white font-bold mb-1">Cekanje igraca...</div>
            <div className="text-gray-400 text-xs mb-3">{gameState.players.length}/8 igraca</div>
            <div className="text-orange-400 text-xs font-mono mb-3">Kod: {g.id}</div>
            <PlayerList players={gameState.players} myId={myId} />
          </div>

          {isCreator && gameState.players.length >= 1 && (
            <button onClick={() => handleStart(g.id)} disabled={acting}
              className="w-full py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg">
              {acting ? 'Pokretanje...' : '▶️ Pokreni igru'}
            </button>
          )}

          {!isCreator && (
            <div className="text-center text-gray-500 text-xs py-2">
              Cekas da kreator pokrene igru...
            </div>
          )}
        </div>
      )
    }

    // ===== FINISHED VIEW =====
    if (isFinished) {
      return (
        <div className="max-w-md mx-auto p-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={handleLeave}
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
            <PlayerList players={gameState.players} myId={myId} busPlayerId={g.busPlayerId} />
          </div>

          {gameState.recentLog?.length > 0 && (
            <div className="bg-gray-800/80 rounded-xl p-3 border border-gray-700">
              <h4 className="text-gray-400 text-xs font-semibold mb-1">Poslednje akcije</h4>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {gameState.recentLog.slice(0, 8).map((entry, i) => (
                  <div key={i} className="text-[10px] px-2 py-1 bg-gray-700/30 rounded text-gray-300">
                    {entry.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleLeave}
            className="mt-2 w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold text-sm">
            Nazad u lobi
          </button>
        </div>
      )
    }

    // ===== BUS PHASE VIEW =====
    if (isBus) {
      const busPlayerInfo = gameState.players.find(p => String(p.id) === String(g.busPlayerId))
      const busPlayerName = busPlayerInfo ? getName(busPlayerInfo) : 'Klovn'
      const isMeBus = gameState.isBusPlayer

      return (
        <div className="max-w-md mx-auto p-3">
          <div className="flex items-center justify-between mb-2">
            <button onClick={handleLeave}
              className="text-gray-400 hover:text-white text-sm">← Nazad</button>
            <h3 className="text-white font-semibold text-sm">🚌 Autobus</h3>
            <div />
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
                {isMeBus && g.busProgress > 0 && (
                  <div className="text-red-400 text-[10px] mt-0.5">
                    Promasaj = {g.busProgress} cug(ova) 🍺
                  </div>
                )}
              </div>
              {g.busCurrentCard && (
                <Card rank={g.busCurrentCard.rank} suit={g.busCurrentCard.suit} />
              )}
            </div>
            <BusProgress progress={g.busProgress} />
          </div>

          {/* Toast notification */}
          <Toast toast={toast} />

          {/* Guess buttons (only for bus player) */}
          <div className="min-h-[52px] mb-2">
            {isMeBus ? (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleBusGuess('higher')} disabled={acting}
                  className="py-3 rounded-xl font-bold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-600 text-white transition-all shadow-lg">
                  🔺 Veca
                </button>
                <button onClick={() => handleBusGuess('lower')} disabled={acting}
                  className="py-3 rounded-xl font-bold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-600 text-white transition-all shadow-lg">
                  🔻 Manja
                </button>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="text-gray-400 text-xs">Cekas {busPlayerName} da pogadja...</div>
              </div>
            )}
          </div>

          {/* Players */}
          <div className="bg-gray-800/80 rounded-xl p-3 border border-gray-700 mb-2">
            <h4 className="text-gray-400 text-xs font-semibold mb-1.5">Igraci</h4>
            <PlayerList players={gameState.players} myId={myId} busPlayerId={g.busPlayerId} />
          </div>

          {/* Recent log - compact */}
          {gameState.recentLog?.length > 0 && (
            <div className="space-y-0.5">
              {gameState.recentLog.slice(0, 3).map((entry, i) => (
                <div key={i} className="text-[10px] px-2 py-1 bg-gray-700/30 rounded text-gray-400">
                  {entry.text}
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
          <button onClick={handleLeave}
            className="text-gray-400 hover:text-white text-sm">← Nazad</button>
          <h3 className="text-white font-semibold text-sm">🚌 Piramida {Math.max(0, g.currentCardIndex + 1)}/15</h3>
          <div />
        </div>

        {/* Pyramid + current flipped card side by side */}
        <div className="bg-gray-800/80 rounded-xl p-2.5 border border-gray-700 mb-2">
          <div className="flex gap-3">
            <div className="flex-1">
              <PyramidGrid pyramid={gameState.pyramid} currentCardIndex={g.currentCardIndex} />
            </div>
            {gameState.currentFlippedCard && (
              <div className="flex flex-col items-center justify-center gap-1 px-2">
                <div className="text-gray-500 text-[10px]">Otvorena</div>
                <Card rank={gameState.currentFlippedCard.rank} suit={gameState.currentFlippedCard.suit} />
                <div className="text-orange-400 text-[10px] font-bold">
                  {gameState.currentFlippedCard.drinkValue}x🍺
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toast notification */}
        <Toast toast={toast} />

        {/* My hand */}
        <div className="bg-gray-800/80 rounded-xl p-2.5 border border-gray-700 mb-2">
          <div className="flex justify-between items-center mb-1.5">
            <h4 className="text-gray-300 text-xs font-semibold">🃏 Tvoja ruka ({gameState.myHand.length})</h4>
            {gameState.isMyMatchTurn && (
              <span className="text-orange-400 text-[10px] animate-pulse font-bold">Tvoj red!</span>
            )}
          </div>
          <PlayerHand
            hand={gameState.myHand}
            matchableCards={gameState.canMatch ? gameState.matchableCards : []}
            onSelectCard={setSelectedCard}
            selectedCard={selectedCard}
            disabled={!gameState.isMyMatchTurn || acting}
          />

          {/* Match target buttons (only when card selected) */}
          {gameState.isMyMatchTurn && selectedCard && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-gray-400 text-[10px] mb-1.5">
                {selectedCard.rank}{selectedCard.suit} — Kome dajes pice?
              </div>
              <div className="flex flex-wrap gap-1.5">
                {gameState.players.map(p => (
                  <button key={p.id} onClick={() => handleMatch(String(p.id))} disabled={acting}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded-lg text-xs font-medium transition-colors">
                    🍺 {getName(p)}
                  </button>
                ))}
                <button onClick={() => setSelectedCard(null)}
                  className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-xs transition-colors">
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons - ALWAYS visible, fixed position */}
        <div className="mb-2">
          {gameState.needsFlip ? (
            <button onClick={handleFlip} disabled={acting}
              className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg">
              {acting ? 'Okrecemo...' : '🃏 Okreni sledecu kartu'}
            </button>
          ) : gameState.isMyMatchTurn && gameState.currentFlippedCard ? (
            <div className="space-y-2">
              {!selectedCard && (
                gameState.canMatch ? (
                  <div className="text-center text-green-400 text-xs font-semibold">
                    Imas match! Klikni kartu {gameState.currentFlippedCard.rank} iz ruke.
                  </div>
                ) : (
                  <div className="text-center text-gray-500 text-[10px]">
                    Trazi se: {gameState.currentFlippedCard.rank} — nemas u ruci
                  </div>
                )
              )}
              <button onClick={handlePass} disabled={acting || !!selectedCard}
                className="w-full py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 disabled:from-gray-700 disabled:to-gray-700 text-white rounded-xl font-semibold text-sm transition-colors">
                Dalje ➡️
              </button>
            </div>
          ) : (
            <div className="py-2.5 text-center text-gray-500 text-[10px]">
              {gameState.currentFlippedCard ? 'Cekas druge igrace...' : ''}
            </div>
          )}
        </div>

        {/* Players inline */}
        <div className="bg-gray-800/80 rounded-xl p-2.5 border border-gray-700">
          <PlayerList players={gameState.players} myId={myId} />
        </div>
      </div>
    )
  }

  // ==================== LOBBY VIEW ====================
  return (
    <div className="max-w-md mx-auto p-3">
      {/* Header */}
      <div className="bg-gray-800/80 rounded-xl p-3 border border-gray-700 shadow-lg mb-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">🚌 Klovn Autobus</h3>
            <p className="text-gray-400 text-xs">Drinking card game za 2-8 igraca!</p>
          </div>
          <button onClick={fetchLobby}
            className="text-xl hover:scale-110 transition-transform">
            🔄
          </button>
        </div>
      </div>

      {/* Create new game */}
      <button onClick={handleCreate} disabled={acting}
        className="w-full py-2.5 mb-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg hover:shadow-orange-500/25">
        {acting ? 'Kreiranje...' : '🎮 Kreiraj novu igru'}
      </button>

      {/* Open games to join */}
      {lobbyGames.length > 0 && (
        <div className="bg-gray-800/80 rounded-xl p-3 border border-gray-700 mb-2">
          <h4 className="text-yellow-400 font-semibold text-xs mb-1.5">📨 Otvorene igre</h4>
          {lobbyGames.map(game => {
            const creatorName = game.players?.[0]?.name || 'Klovn'
            return (
              <div key={game.id} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-2.5 mb-1">
                <div>
                  <span className="text-white text-xs">{creatorName}</span>
                  <span className="text-gray-400 text-[10px] ml-1.5">{game.playerCount}/{game.maxPlayers}</span>
                  <span className="text-gray-500 text-[10px] ml-1.5">#{game.id}</span>
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

      {/* Empty state */}
      {lobbyGames.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <div className="text-3xl mb-1">🚌</div>
          <p className="text-sm">Nema aktivnih igara. Kreiraj novu!</p>
        </div>
      )}
    </div>
  )
}
