'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { listUsers, type AdminUser } from '@/lib/admin-api';

export default function UsuariosPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listUsers(search || undefined, page);
      setUsers(res.data);
      setTotal(res.total);
    } catch {
      setError('Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-6">Usuários</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <input
          type="text"
          placeholder="Buscar por nome, CPF, telefone ou e-mail..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <button
          type="submit"
          className="rounded-lg bg-slate-800 text-white text-sm font-medium px-4 py-2 hover:bg-slate-700 transition"
        >
          Buscar
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
            className="rounded-lg border border-slate-200 text-slate-500 text-sm px-3 py-2 hover:bg-slate-50 transition"
          >
            Limpar
          </button>
        )}
      </form>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">CPF</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">E-mail</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Plano</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-medium text-slate-700">{u.name}</td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell font-mono text-xs">{u.cpf_masked}</td>
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{u.email_masked}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                      u.plan === 'PRO' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {u.plan === 'PRO' ? 'Premium' : 'Gratuito'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                      u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {u.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/usuarios/${u.id}`}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <span>{total} usuários no total</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50 transition"
            >
              Anterior
            </button>
            <span className="px-3 py-1.5 text-xs">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50 transition"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
