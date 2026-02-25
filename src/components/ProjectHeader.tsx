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
    leaveProject,
    addUser,
    removeUser,
    undoDeleteExpense,
    lastDeletedExpense,
    generateInviteLink,
    closeProject,
    reopenProject,
    updateInviteRole,
    canEdit,
    canDelete,
    isClosed
  } = useApp();

  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
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

  const handleLeave = async () => {
    await leaveProject(activeProject.id);
    setShowLeaveConfirm(false);
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

  const handleCloseProject = () => {
    closeProject();
    setShowSettings(false);
  };

  const handleReopenProject = () => {
    reopenProject();
    setShowSettings(false);
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
              {isClosed && <span className="closed-indicator">Cerrado</span>}
            </h1>
          </div>
        </div>

        <div className="header-right">
          {lastDeletedExpense && !isClosed && (
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

          {canEdit && !isClosed && (
            <button
              className="btn-icon"
              onClick={handleShare}
              title="Compartir"
            >
              🔗
            </button>
          )}

          {canDelete ? (
            showDeleteConfirm ? (
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
            )
          ) : (
            showLeaveConfirm ? (
              <div className="delete-confirm">
                <button className="btn btn-danger btn-small" onClick={handleLeave}>
                  Sí
                </button>
                <button className="btn btn-secondary btn-small" onClick={() => setShowLeaveConfirm(false)}>
                  No
                </button>
              </div>
            ) : (
              <button
                className="btn-icon btn-icon-danger"
                onClick={() => setShowLeaveConfirm(true)}
                title="Abandonar proyecto"
              >
                🚪
              </button>
            )
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
              {canEdit && !isClosed ? (
                <>
                  {/* Nombre e Icono (owner/admin, proyecto abierto) */}
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

                  {/* Moneda (owner/admin) */}
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

                  {/* Participantes (owner/admin: editable) */}
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
                </>
              ) : (
                <>
                  {/* Participantes (solo lectura) */}
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Cerrar/Reabrir proyecto (owner o admin) */}
              {canEdit && (
                <div className="settings-section">
                  {isClosed ? (
                    <>
                      <div className="closed-badge">Proyecto cerrado</div>
                      <button
                        className="btn btn-primary btn-block"
                        onClick={handleReopenProject}
                      >
                        Reabrir proyecto
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-warning btn-block"
                      onClick={handleCloseProject}
                    >
                      Cerrar proyecto
                    </button>
                  )}
                </div>
              )}

              {/* Zona peligrosa: Eliminar (solo owner) */}
              {canDelete && (
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
              )}

              {/* Abandonar proyecto (admin y participant) */}
              {!canDelete && (
                <div className="delete-zone">
                  <div className="delete-zone-title">Abandonar proyecto</div>
                  <p className="delete-zone-desc">Saldrás del proyecto. Los gastos y datos se mantendrán intactos.</p>
                  <button
                    className="btn btn-danger btn-block"
                    onClick={() => {
                      setShowSettings(false);
                      setShowLeaveConfirm(true);
                    }}
                  >
                    Abandonar proyecto
                  </button>
                </div>
              )}
            </div>

            {canEdit && !isClosed && (
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={handleSaveSettings}
                >
                  Guardar cambios
                </button>
              </div>
            )}
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
              {/* Selector de rol */}
              <div className="share-role-selector">
                <label>Rol de los invitados:</label>
                <div className="role-selector-buttons">
                  <button
                    type="button"
                    className={`role-option ${activeProject.inviteRole === 'participant' ? 'selected' : ''}`}
                    onClick={() => updateInviteRole('participant')}
                  >
                    Participante
                  </button>
                  <button
                    type="button"
                    className={`role-option ${activeProject.inviteRole === 'admin' ? 'selected' : ''}`}
                    onClick={() => updateInviteRole('admin')}
                  >
                    Administrador
                  </button>
                </div>
                <p className="role-description">
                  {activeProject.inviteRole === 'admin'
                    ? 'Los administradores pueden editar el proyecto, añadir participantes y cerrar/reabrir.'
                    : 'Los participantes pueden ver y añadir gastos.'}
                </p>
              </div>

              <p className="share-description">
                Comparte este enlace con tus amigos para que puedan unirse al proyecto.
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
