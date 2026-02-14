import { useState, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCIES } from '../types';

const GROUP_ICONS = ['✈️', '🍽️', '🏠', '🎉', '🎁', '🏖️', '🎿', '🚗', '🎭', '🛒', '⚽', '🎬', '🍕', '🎂', '💼', '🏕️'];

export function ProjectHeader() {
  const {
    activeProject,
    updateProjectName,
    updateProjectIcon,
    setDefaultCurrency,
    deleteProject,
    addUser,
    removeUser,
    undoDeleteExpense,
    lastDeletedExpense,
    generateInviteLink
  } = useApp();

  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [newParticipant, setNewParticipant] = useState('');

  if (!activeProject) return null;

  const { name, icon, defaultCurrency, users } = activeProject;

  const handleBack = () => {
    window.history.back();
  };

  const handleDelete = () => {
    deleteProject(activeProject.id);
    setShowDeleteConfirm(false);
    // Limpiar la entrada del historial para que no quede huérfana
    window.history.replaceState({ screen: 'projects' }, '');
  };

  const openSettings = () => {
    setEditName(name);
    setEditIcon(icon || '✈️');
    setShowSettings(true);
  };

  const handleSaveSettings = () => {
    if (editName.trim() && editName.trim() !== name) {
      updateProjectName(editName.trim());
    }
    if (editIcon && editIcon !== icon) {
      updateProjectIcon(editIcon);
    }
    setShowSettings(false);
    setShowIconPicker(false);
  };

  const handleAddParticipant = (e: FormEvent) => {
    e.preventDefault();
    if (newParticipant.trim()) {
      addUser(newParticipant.trim());
      setNewParticipant('');
    }
  };

  const handleShare = async () => {
    const link = await generateInviteLink();
    if (link) {
      setShareLink(link);
      setShowShareModal(true);
      setShareCopied(false);
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // Fallback para navegadores que no soportan clipboard API
      const input = document.createElement('input');
      input.value = shareLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  return (
    <>
      <header className="project-header">
        <div className="header-left">
          <button className="btn-icon" onClick={handleBack} title="Volver">
            ←
          </button>

          <div className="header-title">
            <h1>
              <span className="header-icon">{icon || '✈️'}</span>
              {name}
            </h1>
          </div>
        </div>

        <div className="header-right">
          {lastDeletedExpense && (
            <button
              className="btn-icon btn-undo-icon"
              onClick={undoDeleteExpense}
              title="Deshacer"
            >
              ↩
            </button>
          )}

          <button
            className="btn-icon"
            onClick={openSettings}
            title="Ajustes"
          >
            ⚙️
          </button>

          <button
            className="btn-icon"
            onClick={handleShare}
            title="Compartir"
          >
            🔗
          </button>

          {showDeleteConfirm ? (
            <div className="delete-confirm">
              <button className="btn btn-danger btn-small" onClick={handleDelete}>
                Sí
              </button>
              <button className="btn btn-secondary btn-small" onClick={() => setShowDeleteConfirm(false)}>
                No
              </button>
            </div>
          ) : (
            <button
              className="btn-icon btn-icon-danger"
              onClick={() => setShowDeleteConfirm(true)}
              title="Eliminar proyecto"
            >
              🗑️
            </button>
          )}
        </div>
      </header>

      {/* Modal de Ajustes */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Ajustes del proyecto</h4>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowSettings(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* Nombre e Icono */}
              <div className="settings-section">
                <label>Nombre del proyecto</label>
                <div className="input-with-icon">
                  <button
                    type="button"
                    className="icon-picker-button"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                  >
                    {editIcon}
                  </button>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nombre del proyecto"
                    className="input input-with-prefix"
                  />
                </div>

                {showIconPicker && (
                  <div className="icon-picker-dropdown">
                    {GROUP_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className={`icon-picker-option ${editIcon === emoji ? 'selected' : ''}`}
                        onClick={() => {
                          setEditIcon(emoji);
                          setShowIconPicker(false);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Moneda */}
              <div className="settings-section">
                <label>Moneda por defecto</label>
                <select
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  className="input"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Participantes */}
              <div className="settings-section">
                <label>Participantes ({users.length})</label>

                {users.length > 0 && (
                  <div className="settings-participants-list">
                    {users.map((user, index) => (
                      <div key={user.id} className="participant-chip">
                        <span className={`participant-avatar avatar-${(index % 8) + 1}`}>
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="participant-name">{user.name}</span>
                        <button
                          type="button"
                          className="participant-remove"
                          onClick={() => removeUser(user.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleAddParticipant} className="settings-add-participant">
                  <input
                    type="text"
                    value={newParticipant}
                    onChange={(e) => setNewParticipant(e.target.value)}
                    placeholder="Añadir participante"
                    className="input"
                  />
                  <button type="submit" className="btn btn-secondary" disabled={!newParticipant.trim()}>
                    Añadir
                  </button>
                </form>
              </div>

              {/* Zona de eliminar */}
              <div className="delete-zone">
                <div className="delete-zone-title">Zona peligrosa</div>
                <p className="delete-zone-desc">Eliminar este proyecto borrará todos los gastos y participantes.</p>
                <button
                  className="btn btn-danger btn-block"
                  onClick={() => {
                    setShowSettings(false);
                    setShowDeleteConfirm(true);
                  }}
                >
                  Eliminar proyecto
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={handleSaveSettings}
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Compartir */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Compartir proyecto</h4>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowShareModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="share-description">
                Comparte este enlace con tus amigos para que puedan unirse al proyecto y ver los gastos.
              </p>

              <div className="share-link-container">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="input share-link-input"
                />
                <button
                  className={`btn ${shareCopied ? 'btn-success' : 'btn-primary'}`}
                  onClick={copyShareLink}
                >
                  {shareCopied ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
