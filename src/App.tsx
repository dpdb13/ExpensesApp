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
import type { Expense } from './types';
import './App.css';

type Tab = 'gastos' | 'participantes' | 'resumen';

function App() {
  const { user, loading } = useAuth();
  const { activeProject, joinProject, selectProject, isClosed } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('gastos');
  const [joinMessage, setJoinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const navGuardRef = useRef(false);

  // Estado para el modal del formulario de gastos
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const showExpenseFormRef = useRef(false);

  // Abrir formulario para añadir gasto
  const openAddExpense = useCallback(() => {
    setEditingExpense(null);
    setShowExpenseForm(true);
    showExpenseFormRef.current = true;
    window.history.pushState({ screen: 'expense-form' }, '');
  }, []);

  // Abrir formulario para editar gasto
  const openEditExpense = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
    showExpenseFormRef.current = true;
    window.history.pushState({ screen: 'expense-form' }, '');
  }, []);

  // Cerrar formulario (desde botón X o overlay)
  const closeExpenseForm = useCallback(() => {
    if (showExpenseFormRef.current) {
      showExpenseFormRef.current = false;
      setShowExpenseForm(false);
      setEditingExpense(null);
      navGuardRef.current = true;
      window.history.back();
      setTimeout(() => { navGuardRef.current = false; }, 150);
    }
  }, []);

  // Manejar enlace de invitacion
  useEffect(() => {
    const handleJoinLink = async () => {
      const params = new URLSearchParams(window.location.search);
      const joinCode = params.get('join');

      if (joinCode && user) {
        window.history.replaceState({}, '', window.location.pathname);

        const result = await joinProject(joinCode);
        if (result.success) {
          setJoinMessage({ type: 'success', text: '¡Te has unido al proyecto!' });
        } else {
          setJoinMessage({ type: 'error', text: result.error || 'Error al unirse' });
        }

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

  // History API: push cuando cambia el proyecto activo
  const activeProjectId = activeProject?.id;
  useEffect(() => {
    if (activeProjectId) {
      window.history.pushState({ screen: 'project', projectId: activeProjectId }, '');
    }
  }, [activeProjectId]);

  // Manejar navegacion hacia atras
  const handleGoBack = useCallback(() => {
    if (showExpenseFormRef.current) {
      // Cerrar el modal del formulario
      showExpenseFormRef.current = false;
      setShowExpenseForm(false);
      setEditingExpense(null);
    } else if (activeProject) {
      selectProject(null);
    } else {
      // En la lista de proyectos: re-push para no salir de la PWA
      window.history.pushState({ screen: 'projects' }, '');
    }
  }, [activeProject, selectProject]);

  // Escuchar popstate
  useEffect(() => {
    const onPopState = () => {
      if (navGuardRef.current) return;
      navGuardRef.current = true;
      setTimeout(() => { navGuardRef.current = false; }, 150);
      handleGoBack();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [handleGoBack]);

  // Pantalla de carga
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

  // Sin sesion
  if (!user) {
    return <Auth />;
  }

  // Lista de proyectos
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
      </nav>

      <main className="content">
        {activeTab === 'gastos' && (
          <ExpenseList onEditExpense={openEditExpense} />
        )}
        {activeTab === 'participantes' && <UserManager />}
        {activeTab === 'resumen' && <Summary />}
      </main>

      {/* Boton flotante + para añadir gasto */}
      {activeTab === 'gastos' && !isClosed && (
        <button
          className="fab"
          onClick={openAddExpense}
          title="Añadir gasto"
        >
          +
        </button>
      )}

      {/* Modal del formulario de gastos */}
      {showExpenseForm && (
        <ExpenseForm
          editExpense={editingExpense}
          onClose={closeExpenseForm}
        />
      )}
    </div>
  );
}

export default App;
