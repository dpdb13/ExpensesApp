import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCIES } from '../types';

export function ProjectHeader() {
  const { state, updateProjectName, setDefaultCurrency } = useApp();
  const { name, defaultCurrency } = state.project;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);

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

  return (
    <header className="project-header">
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
          <h1 onClick={() => setIsEditing(true)} className="editable-title">
            {name}
            <span className="edit-hint">✏️</span>
          </h1>
        )}
      </div>

      <div className="header-currency">
        <label>Moneda predeterminada:</label>
        <select
          value={defaultCurrency}
          onChange={(e) => setDefaultCurrency(e.target.value)}
          className="input"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.code} - {c.name}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
