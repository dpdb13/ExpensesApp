import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCIES } from '../types';

export function ProjectHeader() {
  const { activeProject, updateProjectName, setDefaultCurrency, selectProject, deleteProject } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(activeProject?.name || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!activeProject) return null;

  const { name, defaultCurrency } = activeProject;

  const handleSave = () => {
    if (editName.trim()) {
      updateProjectName(editName.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditName(name);
      setIsEditing(false);
    }
  };

  const handleBack = () => {
    selectProject(null);
  };

  const handleDelete = () => {
    deleteProject(activeProject.id);
    setShowDeleteConfirm(false);
  };

  return (
    <header className="project-header">
      <div className="header-left">
        <button className="btn btn-back" onClick={handleBack} title="Volver a mis proyectos">
          <span className="back-arrow">&#8592;</span>
          <span className="back-text">Proyectos</span>
        </button>

        <div className="header-title">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="input header-input"
              autoFocus
            />
          ) : (
            <h1 onClick={() => { setEditName(name); setIsEditing(true); }} className="editable-title">
              {name}
              <span className="edit-hint">&#9998;</span>
            </h1>
          )}
        </div>
      </div>

      <div className="header-right">
        <div className="header-currency">
          <label>Moneda:</label>
          <select
            value={defaultCurrency}
            onChange={(e) => setDefaultCurrency(e.target.value)}
            className="input"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code}
              </option>
            ))}
          </select>
        </div>

        {showDeleteConfirm ? (
          <div className="delete-confirm">
            <span>Eliminar proyecto?</span>
            <button className="btn btn-danger btn-small" onClick={handleDelete}>
              Si
            </button>
            <button className="btn btn-secondary btn-small" onClick={() => setShowDeleteConfirm(false)}>
              No
            </button>
          </div>
        ) : (
          <button
            className="btn btn-danger-outline btn-small"
            onClick={() => setShowDeleteConfirm(true)}
            title="Eliminar proyecto"
          >
            Eliminar
          </button>
        )}
      </div>
    </header>
  );
}
