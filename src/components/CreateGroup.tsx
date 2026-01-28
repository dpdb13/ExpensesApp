import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCIES } from '../types';

const GROUP_ICONS = ['✈️', '🍽️', '🏠', '🎉', '🎁', '🏖️', '🎿', '🚗', '🎭', '🛒', '⚽', '🎬', '🍕', '🎂', '💼', '🏕️'];

interface CreateGroupProps {
  onCancel: () => void;
}

export function CreateGroup({ onCancel }: CreateGroupProps) {
  const { createProject } = useApp();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [currency, setCurrency] = useState('EUR');
  const [participants, setParticipants] = useState<string[]>([]);
  const [newParticipant, setNewParticipant] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (newParticipant.trim() && !participants.includes(newParticipant.trim())) {
      setParticipants([...participants, newParticipant.trim()]);
      setNewParticipant('');
    }
  };

  const handleRemoveParticipant = (name: string) => {
    setParticipants(participants.filter(p => p !== name));
  };

  const handleCreate = () => {
    if (name.trim() && participants.length >= 1) {
      createProject(name.trim(), icon, currency, participants);
    }
  };

  const canProceedStep1 = name.trim().length > 0;
  const canProceedStep2 = participants.length >= 1;

  return (
    <div className="create-group-container">
      <div className="create-group-header">
        <button className="btn-back" onClick={onCancel}>
          <span className="back-arrow">←</span>
        </button>
        <h1>Nuevo Grupo</h1>
        <div className="step-indicator">
          <span className={`step ${step >= 1 ? 'active' : ''}`}>1</span>
          <span className="step-line"></span>
          <span className={`step ${step >= 2 ? 'active' : ''}`}>2</span>
        </div>
      </div>

      {step === 1 && (
        <div className="create-group-step">
          <div className="step-content">
            <h2>Detalles del grupo</h2>
            <p className="step-description">Dale un nombre y elige un icono</p>

            {/* Nombre con selector de icono */}
            <div className="form-group">
              <label>Nombre del grupo</label>
              <div className="input-with-icon">
                <button
                  type="button"
                  className="icon-picker-button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                >
                  {icon}
                </button>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Viaje a París"
                  className="input input-with-prefix"
                  autoFocus
                />
              </div>

              {/* Picker de iconos */}
              {showIconPicker && (
                <div className="icon-picker-dropdown">
                  {GROUP_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`icon-picker-option ${icon === emoji ? 'selected' : ''}`}
                      onClick={() => {
                        setIcon(emoji);
                        setShowIconPicker(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Moneda por defecto</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="input"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="step-actions">
            <button
              className="btn btn-primary btn-block"
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="create-group-step">
          <div className="step-content">
            <h2>Participantes</h2>
            <p className="step-description">Añade a las personas que van a compartir gastos</p>

            <form onSubmit={handleAddParticipant} className="add-participant-form">
              <input
                type="text"
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                placeholder="Nombre del participante"
                className="input"
                autoFocus
              />
              <button type="submit" className="btn btn-secondary" disabled={!newParticipant.trim()}>
                Añadir
              </button>
            </form>

            {participants.length === 0 ? (
              <div className="empty-participants">
                <p>Añade al menos 1 participante para continuar</p>
              </div>
            ) : (
              <div className="participants-list">
                {participants.map((name, index) => (
                  <div key={name} className="participant-chip">
                    <span className={`participant-avatar avatar-${(index % 8) + 1}`}>
                      {name.charAt(0).toUpperCase()}
                    </span>
                    <span className="participant-name">{name}</span>
                    <button
                      type="button"
                      className="participant-remove"
                      onClick={() => handleRemoveParticipant(name)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="step-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setStep(1)}
            >
              Atrás
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={!canProceedStep2}
            >
              Crear Grupo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
