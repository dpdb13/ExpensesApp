import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

// Normaliza un texto para comparar nombres (minúsculas, sin tildes)
const normalize = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

/**
 * Modal "¿Quién eres?": aparece la primera vez que entras en un grupo y aún no has
 * dicho qué participante eres. Pre-marca el nombre más parecido al de tu cuenta.
 * No se muestra si ya estás vinculado (myMemberId) ni si decides saltarlo.
 */
export function WhoAmI() {
  const { activeProject, myMemberId, claimMember } = useApp();
  const { user } = useAuth();

  const [skipped, setSkipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nombre de la cuenta para sugerir coincidencia
  const accountName = useMemo(() => {
    const meta = (user?.user_metadata?.display_name as string | undefined) || '';
    if (meta.trim()) return meta.trim();
    return user?.email?.split('@')[0] ?? '';
  }, [user]);

  const freeMembers = useMemo(
    () => (activeProject?.users ?? []).filter(u => u.userId === null),
    [activeProject]
  );

  // Pre-selección: nombre libre que coincide (o más se parece) al de la cuenta
  const bestMatchId = useMemo(() => {
    if (!accountName || freeMembers.length === 0) return null;
    const target = normalize(accountName);
    const exact = freeMembers.find(u => normalize(u.name) === target);
    if (exact) return exact.id;
    const partial = freeMembers.find(
      u => normalize(u.name).includes(target) || target.includes(normalize(u.name))
    );
    return partial?.id ?? null;
  }, [accountName, freeMembers]);

  const [selectedId, setSelectedId] = useState<string | null>(bestMatchId);

  // No mostrar si no hay grupo, ya estás vinculado, no hay participantes, o lo saltaste
  if (!activeProject || myMemberId !== null || activeProject.users.length === 0 || skipped) {
    return null;
  }

  const handleConfirm = async () => {
    if (!selectedId || saving) return;
    setSaving(true);
    setError(null);
    const result = await claimMember(selectedId);
    setSaving(false);
    if (!result.success) {
      setError(result.error || 'No se pudo vincular tu nombre');
    }
    // Si va bien, myMemberId pasa a estar relleno y el modal se oculta solo
  };

  const noFreeNames = freeMembers.length === 0;

  return (
    <div className="modal-overlay" onClick={() => setSkipped(true)}>
      <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h4>¿Quién eres en este grupo?</h4>
        </div>

        <div className="modal-body">
          <p className="whoami-intro">
            Elige tu nombre para ver en cada gasto cuánto te toca o si no participaste.
          </p>

          {noFreeNames ? (
            <p className="whoami-empty">
              Todos los participantes ya están vinculados a una cuenta. Si tu nombre no
              está, pídele a quien gestiona el grupo que te añada.
            </p>
          ) : (
            <div className="whoami-list">
              {activeProject.users.map((u) => {
                const taken = u.userId !== null;
                const selected = u.id === selectedId;
                return (
                  <button
                    key={u.id}
                    type="button"
                    className={`whoami-option ${selected ? 'selected' : ''} ${taken ? 'taken' : ''}`}
                    disabled={taken || saving}
                    onClick={() => setSelectedId(u.id)}
                  >
                    <span className="whoami-option-name">{u.name}</span>
                    {taken && <span className="whoami-option-tag">ya vinculado</span>}
                    {selected && !taken && <span className="whoami-option-check">✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          {error && <p className="whoami-error">{error}</p>}
        </div>

        <div className="modal-footer whoami-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSkipped(true)}
            disabled={saving}
          >
            Saltar por ahora
          </button>
          {!noFreeNames && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={!selectedId || saving}
            >
              {saving ? 'Guardando…' : 'Confirmar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
