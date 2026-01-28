import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { CreateGroup } from './CreateGroup';
import { CURRENCIES } from '../types';

export function ProjectList() {
  const { state, selectProject } = useApp();
  const { user, signOut } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const getCurrencySymbol = (code: string) => {
    const currency = CURRENCIES.find((c) => c.code === code);
    return currency?.symbol || code;
  };

  const getProjectTotal = (projectId: string) => {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return 0;
    return project.expenses.reduce((sum, e) => sum + e.amount, 0);
  };

  if (isCreating) {
    return <CreateGroup onCancel={() => setIsCreating(false)} />;
  }

  return (
    <div className="project-list-container">
      <header className="project-list-header">
        <h1>Mis Grupos</h1>
        <p className="project-list-subtitle">Gestiona tus gastos compartidos</p>
        <div className="user-menu">
          <span className="user-email">{user?.email}</span>
          <button className="btn-logout" onClick={signOut}>
            Salir
          </button>
        </div>
      </header>

      <div className="project-list">
        {state.projects.length === 0 && (
          <div className="empty-projects">
            <div className="empty-icon">💰</div>
            <p>No tienes grupos todavía</p>
            <p>Crea tu primer grupo para empezar a dividir gastos</p>
          </div>
        )}

        {state.projects.map((project, index) => (
          <button
            key={project.id}
            className="project-card"
            onClick={() => selectProject(project.id)}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className={`project-card-icon project-card-icon-${(index % 6) + 1}`}>
              {project.icon || '✈️'}
            </div>
            <div className="project-card-content">
              <h2 className="project-card-name">{project.name}</h2>
              <div className="project-card-details">
                <span className="project-card-stat">
                  <span className="stat-icon">👥</span>
                  {project.users.length}
                </span>
                <span className="project-card-stat">
                  <span className="stat-icon">📝</span>
                  {project.expenses.length}
                </span>
              </div>
            </div>
            <div className="project-card-total-container">
              <span className="project-card-total">
                {getCurrencySymbol(project.defaultCurrency)}{getProjectTotal(project.id).toFixed(0)}
              </span>
              <span className="project-card-arrow">→</span>
            </div>
          </button>
        ))}

        <button className="add-project-btn" onClick={() => setIsCreating(true)}>
          <span className="add-icon">+</span>
          <span>Nuevo Grupo</span>
        </button>
      </div>
    </div>
  );
}
