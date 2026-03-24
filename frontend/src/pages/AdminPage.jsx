import { useState, useEffect } from "react"
import { Users, FileText, MessageSquare, Shield, ArrowLeft, RefreshCw } from "lucide-react"
import { useAuth } from "../context/AuthContext"

function useAdminFetch(path) {
  const { getToken } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

export function AdminPage({ onBack }) {
  const { getToken } = useAuth()
  const [tab, setTab] = useState("users")  // ← estaba faltando

  // ← estos tres estaban faltando
  const { data: stats } = useAdminFetch("/admin/stats")
  const { data: users, loading: usersLoading, refetch: refetchUsers } = useAdminFetch("/admin/users")
  const { data: logs, loading: logsLoading } = useAdminFetch("/admin/audit-logs?limit=50")

  const toggleUser = async (userId, isActive) => {
    const token = await getToken()
    const action = isActive ? "deactivate" : "activate"
    await fetch(`${import.meta.env.VITE_API_URL}/admin/users/${userId}/${action}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    })
    refetchUsers()
  }

  const TAB = (t, label) => (
    <button
      onClick={() => setTab(t)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        tab === t
          ? "bg-accent-blue text-white"
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
            <div className="w-9 h-9 rounded-xl bg-accent-blue/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent-blue" />
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
              { label: "Usuarios",    value: stats.total_users,     icon: Users,          color: "text-accent-blue" },
              { label: "Documentos",  value: stats.total_documents,  icon: FileText,       color: "text-accent-violet" },
              { label: "Mensajes",    value: stats.total_messages,   icon: MessageSquare,  color: "text-accent-green" },
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
          {TAB("users", "👥 Usuarios")}
          {TAB("logs",  "📋 Audit Log")}
        </div>

        {/* Tab Usuarios */}
        {tab === "users" && (
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-medium text-text-primary">Usuarios registrados</span>
              <button onClick={refetchUsers}
                className="p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors text-text-muted hover:text-text-primary">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg-tertiary">
                  <tr>
                    {["Nombre", "Documentos", "Rol", "Estado", "Acciones"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usersLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted text-sm">
                      Cargando usuarios...
                    </td></tr>
                  ) : users?.map((u) => (
                    <tr key={u.id} className="hover:bg-bg-tertiary/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {u.first_name} {u.last_name}
                        <span className="block text-xs text-text-muted font-normal">{u.id.slice(0, 8)}…</span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{u.document_count}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          u.role === "admin"
                            ? "bg-accent-blue/20 text-accent-blue"
                            : "bg-bg-tertiary text-text-muted"
                        }`}>
                          {u.role || "user"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          u.active !== false
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}>
                          {u.active !== false ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
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
                    {["Fecha", "Usuario", "Acción", "Detalle"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logsLoading ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-text-muted text-sm">
                      Cargando logs...
                    </td></tr>
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
      </div>
    </div>
  )
}