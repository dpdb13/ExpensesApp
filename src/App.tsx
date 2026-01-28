import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';
import { Auth } from './components/Auth';
import { ProjectList } from './components/ProjectList';
import { ProjectHeader } from './components/ProjectHeader';
import { UserManager } from './components/UserManager';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { Summary } from './components/Summary';
import { MonthlySummary } from './components/MonthlySummary';
import './App.css';

type Tab = 'gastos' | 'participantes' | 'resumen' | 'mensual';

function App() {
  const { user, loading } = useAuth();
  const { activeProject } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('gastos');

  // Mostrar pantalla de carga mientras se verifica la sesión
  if (loading) {
    return (
      <div className="app loading-screen">
        <div className="loading-content">
          <span className="loading-icon">💰</span>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario, mostrar pantalla de login
  if (!user) {
    return <Auth />;
  }

  // Si no hay proyecto activo, mostrar lista de proyectos
  if (!activeProject) {
    return (
      <div className="app">
        <ProjectList />
      </div>
    );
  }

  return (
    <div className="app">
      <ProjectHeader />

      <nav className="tabs">
        <button
          className={`tab ${activeTab === 'gastos' ? 'active' : ''}`}
          onClick={() => setActiveTab('gastos')}
        >
          Gastos
        </button>
        <button
          className={`tab ${activeTab === 'participantes' ? 'active' : ''}`}
          onClick={() => setActiveTab('participantes')}
        >
          Participantes
        </button>
        <button
          className={`tab ${activeTab === 'resumen' ? 'active' : ''}`}
          onClick={() => setActiveTab('resumen')}
        >
          Resumen
        </button>
        <button
          className={`tab ${activeTab === 'mensual' ? 'active' : ''}`}
          onClick={() => setActiveTab('mensual')}
        >
          Por Mes
        </button>
      </nav>

      <main className="content">
        {activeTab === 'gastos' && (
          <div className="gastos-view">
            <ExpenseForm />
            <ExpenseList />
          </div>
        )}
        {activeTab === 'participantes' && <UserManager />}
        {activeTab === 'resumen' && <Summary />}
        {activeTab === 'mensual' && <MonthlySummary />}
      </main>
    </div>
  );
}

export default App;
