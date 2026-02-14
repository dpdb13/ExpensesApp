import { useState, useEffect, useCallback, useRef } from 'react';
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
  const { activeProject, joinProject, selectProject } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('gastos');
  const [joinMessage, setJoinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const navGuardRef = useRef(false);
  const formDirtyRef = useRef(false);

  // Callback para que ExpenseForm avise si tiene datos sin guardar
  const handleFormDirtyChange = useCallback((dirty: boolean) => {
    formDirtyRef.current = dirty;
  }, []);

  // Manejar enlace de invitación
  useEffect(() => {
    const handleJoinLink = async () => {
      const params = new URLSearchParams(window.location.search);
      const joinCode = params.get('join');

      if (joinCode && user) {
        // Limpiar URL
        window.history.replaceState({}, '', window.location.pathname);

        const result = await joinProject(joinCode);
        if (result.success) {
          setJoinMessage({ type: 'success', text: '¡Te has unido al proyecto!' });
        } else {
          setJoinMessage({ type: 'error', text: result.error || 'Error al unirse' });
        }

        // Ocultar mensaje después de 3 segundos
        setTimeout(() => setJoinMessage(null), 3000);
      }
    };

    if (user && !loading) {
      handleJoinLink();
    }
  }, [user, loading, joinProject]);

  // History API: estado inicial
  useEffect(() => {
    window.history.replaceState({ screen: 'projects' }, '');
  }, []);

  // History API: push solo cuando cambia el proyecto activo (por ID, no por referencia)
  const activeProjectId = activeProject?.id;
  useEffect(() => {
    if (activeProjectId) {
      window.history.pushState({ screen: 'project', projectId: activeProjectId }, '');
    }
  }, [activeProjectId]);

  // Manejar navegación hacia atrás (llamado desde popstate)
  const handleGoBack = useCallback(() => {
    if (activeProject) {
      if (formDirtyRef.current && activeTab === 'gastos') {
        // El formulario tiene datos, pedir confirmación y re-push
        setShowExitConfirm(true);
        window.history.pushState({ screen: 'project', projectId: activeProject.id }, '');
      } else {
        selectProject(null);
      }
    } else {
      // En la lista de proyectos: re-push para no salir de la PWA
      window.history.pushState({ screen: 'projects' }, '');
    }
  }, [activeProject, activeTab, selectProject]);

  // Escuchar popstate (gesto de back / botón atrás)
  useEffect(() => {
    const onPopState = () => {
      if (navGuardRef.current) return;
      navGuardRef.current = true;
      requestAnimationFrame(() => { navGuardRef.current = false; });
      handleGoBack();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [handleGoBack]);

  // Confirmar salida del proyecto
  const confirmExit = useCallback(() => {
    setShowExitConfirm(false);
    formDirtyRef.current = false;
    navGuardRef.current = true;
    window.history.back();
    requestAnimationFrame(() => { navGuardRef.current = false; });
    selectProject(null);
  }, [selectProject]);

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
        {joinMessage && (
          <div className={`toast toast-${joinMessage.type}`}>
            {joinMessage.text}
          </div>
        )}
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
            <ExpenseForm onDirtyChange={handleFormDirtyChange} />
            <ExpenseList />
          </div>
        )}
        {activeTab === 'participantes' && <UserManager />}
        {activeTab === 'resumen' && <Summary />}
        {activeTab === 'mensual' && <MonthlySummary />}
      </main>

      {showExitConfirm && (
        <div className="modal-overlay exit-confirm-overlay" onClick={() => setShowExitConfirm(false)}>
          <div className="exit-confirm-modal" onClick={e => e.stopPropagation()}>
            <p className="exit-confirm-title">Tienes un gasto sin guardar</p>
            <p className="exit-confirm-subtitle">Si sales ahora, perderás los datos del formulario.</p>
            <div className="exit-confirm-actions">
              <button className="btn btn-secondary" onClick={() => setShowExitConfirm(false)}>
                Cancelar
              </button>
              <button className="btn btn-danger" onClick={confirmExit}>
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
