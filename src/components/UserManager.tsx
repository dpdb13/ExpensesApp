import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export function UserManager() {
  const { state, addUser, removeUser } = useApp();
  const [newUserName, setNewUserName] = useState('');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      addUser(newUserName.trim());
      setNewUserName('');
    }
  };

  return (
    <div className="user-manager">
      <h3>Participantes</h3>

      <form onSubmit={handleAddUser} className="add-user-form">
        <input
          type="text"
          value={newUserName}
          onChange={(e) => setNewUserName(e.target.value)}
          placeholder="Nombre del participante"
          className="input"
        />
        <button type="submit" className="btn btn-primary">
          Añadir
        </button>
      </form>

      <ul className="user-list">
        {state.project.users.map((user) => (
          <li key={user.id} className="user-item">
            <span className="user-name">{user.name}</span>
            <button
              onClick={() => removeUser(user.id)}
              className="btn btn-danger btn-small"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>

      {state.project.users.length === 0 && (
        <p className="empty-message">No hay participantes. Añade al menos uno para comenzar.</p>
      )}
    </div>
  );
}
