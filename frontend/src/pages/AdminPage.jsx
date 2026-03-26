import { useState, useEffect, useRef } from "react"
import {
  Users, FileText, MessageSquare, Shield, ArrowLeft,
  RefreshCw, FolderOpen, X, Send, ChevronRight, File,
  Eye, Globe
} from "lucide-react"
import { useAuth } from "../context/AuthContext"

// ─── hook reutilizable ───────────────────────────────────────────────────────
function useAdminFetch(path) {
  const { getToken } = useAuth()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 403) throw new Error("No tienes permisos de administrador.")
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [path])
  return { data, loading, error, refetch: fetchData }
}

// ─── Panel lateral: documentos + chat RAG de un usuario ──────────────────────
function UserDocsPanel({ user, onClose, getToken }) {
  const [docs, setDocs]                     = useState([])
  const [loadingDocs, setLoadingDocs]       = useState(true)
  const [selectedDocIds, setSelectedDocIds] = useState([])
  const [messages, setMessages]             = useState([])
  const [input, setInput]                   = useState("")
  const [sending, setSending]               = useState(false)
  const chatEndRef                          = useRef(null)

  useEffect(() => {
    if (!user) return
    setLoadingDocs(true)
    setMessages([])
    setSelectedDocIds([]);

    (async () => {
      try {
        const token = await getToken()
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/admin/users/${user.id}/documents`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const data = await res.json()
        setDocs(data.documents || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingDocs(false)
      }
    })()
  }, [user])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const toggleDoc = (id) =>
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const question = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: question }])
    setSending(true)

    try {
      const token = await getToken()
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/users/${user.id}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            question,
            document_ids: selectedDocIds.length > 0 ? selectedDocIds : null,
          }),
        }
      )
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.answer,
        sources: data.sources || [],
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Error al procesar la pregunta.",
        sources: [],
      }])
    } finally {
      setSending(false)
    }
  }

  const userName = `${user.first_name} ${user.last_name}`.trim()

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col w-full max-w-xl bg-bg-primary border-l border-border shadow-2xl"
        style={{ animation: "slideInPanel 0.22s cubic-bezier(.25,.8,.25,1)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-bg-secondary">
          <div className="w-9 h-9 rounded-xl bg-accent-green/15 flex items-center justify-center flex-shrink-0">
            <FolderOpen className="w-4 h-4 text-accent-green" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{userName}</p>
            <p className="text-xs text-text-muted truncate">{user.id.slice(0, 8)}… · {docs.length} doc{docs.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filtro documentos */}
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2.5">Documentos del usuario</p>
          {loadingDocs ? (
            <div className="flex gap-2">
              {[80, 110, 90].map(w => (
                <div key={w} className="h-7 rounded-full bg-bg-tertiary animate-pulse" style={{ width: w }} />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <div className="flex items-center gap-2 text-text-muted text-sm py-1">
              <File className="w-4 h-4" />
              Este usuario no tiene documentos aún.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {docs.map(doc => {
                const active = selectedDocIds.includes(doc.id)
                return (
                  <div key={doc.id} className="flex items-center gap-1">
                    <button
                      onClick={() => toggleDoc(doc.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        active
                          ? "border-accent-green text-accent-green bg-accent-green/10"
                          : "border-border text-text-secondary hover:border-accent-green/50 hover:text-text-primary bg-bg-secondary"
                      }`}
                    >
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />}
                      <span className="max-w-[140px] truncate">{doc.name}</span>
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const token = await getToken()
                          const res = await fetch(
                            `${import.meta.env.VITE_API_URL}/admin/documents/${doc.id}/url`,
                            { headers: { Authorization: `Bearer ${token}` } }
                          )
                          const data = await res.json()
                          window.open(data.url, "_blank")
                        } catch {
                          alert("No se pudo obtener el archivo.")
                        }
                      }}
                      className="p-1 rounded-full text-text-muted hover:text-accent-green transition-colors"
                      title="Ver documento"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          {selectedDocIds.length > 0 && (
            <button
              onClick={() => setSelectedDocIds([])}
              className="mt-2 text-xs text-text-muted hover:text-text-primary underline underline-offset-2 transition-colors"
            >
              Limpiar filtro (usar todos)
            </button>
          )}
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-accent-green" />
              </div>
              <div>
                <p className="text-text-primary text-sm font-medium">Consulta sobre los documentos de {user.first_name}</p>
                <p className="text-text-muted text-xs mt-1 max-w-xs">
                  {selectedDocIds.length > 0
                    ? `Consultando ${selectedDocIds.length} documento(s) seleccionado(s)`
                    : "Consultando todos los documentos del usuario"
                  }
                </p>
              </div>
              {docs.length > 0 && (
                <div className="flex flex-col gap-2 w-full max-w-sm">
                  {[
                    "Dame un resumen de los documentos",
                    "¿Cuáles son los puntos más importantes?",
                  ].map(s => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl border border-border text-xs text-text-secondary hover:border-accent-green/50 hover:text-text-primary bg-bg-secondary transition-all group text-left"
                    >
                      {s}
                      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-accent-green" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent-green text-white rounded-br-sm"
                  : "bg-bg-secondary border border-border text-text-primary rounded-bl-sm"
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.sources?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/20 flex flex-wrap gap-1">
                    {msg.sources.map(s => (
                      <span key={s} className="inline-flex items-center gap-1 text-xs opacity-75">
                        <File className="w-3 h-3" />{s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-bg-secondary border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-2 h-2 rounded-full bg-accent-green animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-border bg-bg-secondary">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={
                docs.length === 0
                  ? "Sin documentos para consultar"
                  : selectedDocIds.length > 0
                  ? `Preguntando sobre ${selectedDocIds.length} doc(s)...`
                  : "Pregunta sobre los documentos del usuario..."
              }
              disabled={docs.length === 0 || sending}
              rows={1}
              className="flex-1 resize-none bg-bg-primary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-green transition-colors disabled:opacity-40"
              style={{ minHeight: 42, maxHeight: 110 }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending || docs.length === 0}
              className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center bg-accent-green hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-xs text-text-muted mt-1.5">Enter para enviar · Shift+Enter para nueva línea</p>
        </div>
      </div>
      <style>{`
        @keyframes slideInPanel {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}

// ─── Chat Global ─────────────────────────────────────────────────────────────
function GlobalChatTab({ getToken }) {
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState("")
  const [sending, setSending]   = useState(false)
  const chatEndRef              = useRef(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const question = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: question }])
    setSending(true)

    try {
      const token = await getToken()
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.answer,
        sources: data.sources || [],
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Error al procesar la pregunta.",
        sources: [],
      }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden flex flex-col" style={{ height: "60vh" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-accent-green/15 flex items-center justify-center">
          <Globe className="w-3.5 h-3.5 text-accent-green" />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">Chat Global</p>
          <p className="text-xs text-text-muted">Consulta sobre los documentos de todos los usuarios</p>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-accent-green" />
            </div>
            <div>
              <p className="text-text-primary text-sm font-medium">Análisis global de la plataforma</p>
              <p className="text-text-muted text-xs mt-1 max-w-sm">
                Haz preguntas que abarquen los documentos de todos los usuarios. El modelo indicará de quién es cada dato.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {[
                "Que documentos hablan de [tu informacion]?",
                "Dame un resumen general de todos los documentos",
                "¿Quien tiene mas documentos?",
              ].map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl border border-border text-xs text-text-secondary hover:border-accent-green/50 hover:text-text-primary bg-bg-primary transition-all group text-left"
                >
                  {s}
                  <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-accent-green" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-accent-green text-white rounded-br-sm"
                : "bg-bg-primary border border-border text-text-primary rounded-bl-sm"
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.sources?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-2">
                  {msg.sources.map((s, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 text-xs text-text-muted bg-bg-secondary px-2 py-0.5 rounded-full border border-border">
                      <Users className="w-3 h-3" />
                      {s.user} · {s.doc}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-bg-primary border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
              {[0, 150, 300].map(d => (
                <span key={d} className="w-2 h-2 rounded-full bg-accent-green animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-bg-primary">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Pregunta sobre todos los documentos de la plataforma..."
            disabled={sending}
            rows={1}
            className="flex-1 resize-none bg-bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-green transition-colors disabled:opacity-40"
            style={{ minHeight: 42, maxHeight: 110 }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center bg-accent-green hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-xs text-text-muted mt-1.5">Enter para enviar · Shift+Enter para nueva línea</p>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export function AdminPage({ onBack }) {
  const { getToken } = useAuth()
  const [tab, setTab]                       = useState("users")
  const [inspectedUser, setInspectedUser]   = useState(null)

  const { data: stats }                                                    = useAdminFetch("/admin/stats")
  const { data: users, loading: usersLoading, refetch: refetchUsers }      = useAdminFetch("/admin/users")
  const { data: logs,  loading: logsLoading }                              = useAdminFetch("/admin/audit-logs?limit=50")

  const toggleUser = async (userId, isActive) => {
    const token  = await getToken()
    const action = isActive ? "deactivate" : "activate"
    await fetch(`${import.meta.env.VITE_API_URL}/admin/users/${userId}/${action}`, {
      method:  "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    })
    refetchUsers()
  }

  const TAB = (t, label) => (
    <button
      onClick={() => setTab(t)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        tab === t
          ? "bg-accent-green text-white"
          : "text-text-secondary hover:bg-bg-tertiary"
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-bg-primary p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-green/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent-green" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Panel de Administración</h1>
              <p className="text-xs text-text-muted">Gestión de usuarios, documentos y actividad</p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Usuarios",   value: stats.total_users,     icon: Users,         color: "text-accent-rag"    },
              { label: "Documentos", value: stats.total_documents,  icon: FileText,      color: "text-accent-violet" },
              { label: "Mensajes",   value: stats.total_messages,   icon: MessageSquare, color: "text-accent-green"  },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-bg-secondary border border-border rounded-xl p-5">
                <Icon className={`w-5 h-5 mb-3 ${color}`} />
                <div className="text-3xl font-bold text-text-primary mb-1">{value ?? "—"}</div>
                <div className="text-xs text-text-muted">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {TAB("users",  "👥 Usuarios")}
          {TAB("logs",   "📋 Audit Log")}
          {TAB("global", "🌐 Chat Global")}
        </div>

        {/* Tab Usuarios */}
        {tab === "users" && (
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium text-text-primary">Usuarios registrados</span>
              <button onClick={refetchUsers} className="p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors text-text-muted hover:text-text-primary">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg-tertiary">
                  <tr>
                    {["Nombre", "Documentos", "Rol", "Estado", "Acciones"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usersLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted text-sm">Cargando usuarios...</td></tr>
                  ) : users?.map(u => (
                    <tr key={u.id} className="hover:bg-bg-tertiary/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {u.first_name} {u.last_name}
                        <span className="block text-xs text-text-muted font-normal">{u.id.slice(0, 8)}…</span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{u.document_count}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          u.role === "admin" ? "bg-accent-green/20 text-accent-green" : "bg-bg-tertiary text-text-muted"
                        }`}>
                          {u.role || "user"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          u.active !== false ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        }`}>
                          {u.active !== false ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setInspectedUser(u)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border border-border text-text-secondary hover:border-accent-green hover:text-accent-green bg-bg-tertiary/50 transition-all"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            Ver Docs
                          </button>
                          {u.role !== "admin" && (
                            <button
                              onClick={() => toggleUser(u.id, u.active !== false)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                u.active !== false
                                  ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                  : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                              }`}
                            >
                              {u.active !== false ? "Desactivar" : "Activar"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Audit Log */}
        {tab === "logs" && (
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="text-sm font-medium text-text-primary">Últimos 50 eventos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg-tertiary">
                  <tr>
                    {["Fecha", "Usuario", "Acción", "Detalle"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logsLoading ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-text-muted text-sm">Cargando logs...</td></tr>
                  ) : logs?.map((log, i) => (
                    <tr key={i} className="hover:bg-bg-tertiary/50 transition-colors">
                      <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("es-HN")}
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs">{log.user_id?.slice(0, 8)}…</td>
                      <td className="px-4 py-3 font-medium text-text-primary">{log.action}</td>
                      <td className="px-4 py-3 text-text-muted text-xs max-w-xs truncate">
                        {typeof log.details === "object" ? JSON.stringify(log.details) : log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Chat Global */}
        {tab === "global" && <GlobalChatTab getToken={getToken} />}

      </div>

      {/* Panel lateral */}
      {inspectedUser && (
        <UserDocsPanel
          user={inspectedUser}
          onClose={() => setInspectedUser(null)}
          getToken={getToken}
        />
      )}
    </div>
  )
}