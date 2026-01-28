import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { User } from '../types';

export function UserManager() {
  const { activeProject, addUser, removeUser } = useApp();
  const [newUserName, setNewUserName] = useState('');

  if (!activeProject) return null;

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      addUser(newUserName.trim());
      setNewUserName('');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarClass = (index: number) => {
    return `avatar avatar-${(index % 8) + 1}`;
  };

  return (
    <div className="user-manager">
      <h3>Participantes ({activeProject.users.length})</h3>

      <form onSubmit={handleAddUser} className="add-user-form">
        <input
          type="text"
          value={newUserName}
          onChange={(e) => setNewUserName(e.target.value)}
          placeholder="Nombre del participante"
          className="input"
        />
        <button type="submit" className="btn btn-primary" disabled={!newUserName.trim()}>
          Añadir
        </button>
      </form>

      {activeProject.users.length === 0 ? (
        <div className="empty-message">
          <p>No hay participantes todavía</p>
          <p>Añade al menos uno para comenzar</p>
        </div>
      ) : (
        <div className="user-grid">
          {activeProject.users.map((user: User, index: number) => (
            <div key={user.id} className="user-card">
              <div className={getAvatarClass(index)}>
                {getInitials(user.name)}
              </div>
              <div className="user-card-info">
                <span className="user-card-name">{user.name}</span>
              </div>
              <button
                onClick={() => removeUser(user.id)}
                className="user-card-delete"
                title="Eliminar participante"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
