import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { CreateGroup } from './CreateGroup';

export function ProjectList() {
  const { state, selectProject } = useApp();
  const { user, signOut } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  if (isCreating) {
    return <CreateGroup onCancel={() => setIsCreating(false)} />;
  }

  const openProjects = state.projects.filter(p => !p.closedAt);
  const closedProjects = state.projects.filter(p => p.closedAt);

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
        {openProjects.length === 0 && closedProjects.length === 0 && (
          <div className="empty-projects">
            <div className="empty-icon">💰</div>
            <p>No tienes grupos todavía</p>
            <p>Crea tu primer grupo para empezar a dividir gastos</p>
          </div>
        )}

        {openProjects.map((project, index) => (
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
              <span className="project-card-arrow">→</span>
            </div>
          </button>
        ))}

        <button className="add-project-btn" onClick={() => setIsCreating(true)}>
          <span className="add-icon">+</span>
          <span>Nuevo Grupo</span>
        </button>

        {closedProjects.length > 0 && (
          <>
            <div className="closed-projects-divider">
              <span>Proyectos cerrados</span>
            </div>
            {closedProjects.map((project, index) => (
              <button
                key={project.id}
                className="project-card project-card-closed"
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
                  <span className="closed-badge-small">Cerrado</span>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
