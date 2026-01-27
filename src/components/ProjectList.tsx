import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCIES } from '../types';

export function ProjectList() {
  const { state, createProject, selectProject } = useApp();
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      createProject(newProjectName.trim());
      setNewProjectName('');
      setIsCreating(false);
    }
  };

  const getCurrencySymbol = (code: string) => {
    const currency = CURRENCIES.find((c) => c.code === code);
    return currency?.symbol || code;
  };

  const getProjectTotal = (projectId: string) => {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return 0;
    return project.expenses.reduce((sum, e) => sum + e.amount, 0);
  };

  return (
    <div className="project-list-container">
      <header className="project-list-header">
        <h1>Mis Proyectos</h1>
        <p className="project-list-subtitle">Selecciona un proyecto o crea uno nuevo</p>
      </header>

      <div className="project-list">
        {state.projects.length === 0 && !isCreating && (
          <div className="empty-projects">
            <p>No tienes proyectos todavia.</p>
            <p>Crea tu primer proyecto para empezar a registrar gastos.</p>
          </div>
        )}

        {state.projects.map((project) => (
          <button
            key={project.id}
            className="project-card"
            onClick={() => selectProject(project.id)}
          >
            <div className="project-card-header">
              <h2 className="project-card-name">{project.name}</h2>
              <span className="project-card-total">
                {getCurrencySymbol(project.defaultCurrency)}
                {getProjectTotal(project.id).toFixed(2)}
              </span>
            </div>
            <div className="project-card-details">
              <span>{project.users.length} participantes</span>
              <span>{project.expenses.length} gastos</span>
            </div>
          </button>
        ))}

        {isCreating ? (
          <form onSubmit={handleCreate} className="new-project-form">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Nombre del proyecto (ej: Viaje a Paris)"
              className="input"
              autoFocus
            />
            <div className="new-project-buttons">
              <button type="submit" className="btn btn-primary" disabled={!newProjectName.trim()}>
                Crear
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsCreating(false);
                  setNewProjectName('');
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button className="add-project-btn" onClick={() => setIsCreating(true)}>
            <span className="add-icon">+</span>
            <span>Nuevo Proyecto</span>
          </button>
        )}
      </div>
    </div>
  );
}
