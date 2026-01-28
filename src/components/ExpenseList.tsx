import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCIES, type ExpenseShare } from '../types';

export function ExpenseList() {
  const { activeProject, getUserById, removeExpense } = useApp();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!activeProject) return null;

  const { expenses, users } = activeProject;

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find((c) => c.code === code)?.symbol || code;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarClass = (userId: string) => {
    const index = users.findIndex((u) => u.id === userId);
    return `avatar avatar-sm avatar-${((index >= 0 ? index : 0) % 8) + 1}`;
  };

  const handleDeleteClick = (expenseId: string) => {
    setDeleteConfirmId(expenseId);
  };

  const handleConfirmDelete = (expenseId: string) => {
    removeExpense(expenseId);
    setDeleteConfirmId(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (expenses.length === 0) {
    return (
      <div className="expense-list">
        <h3>Gastos</h3>
        <div className="empty-message">
          <p>No hay gastos registrados</p>
          <p>Añade tu primer gasto arriba</p>
        </div>
      </div>
    );
  }

  return (
    <div className="expense-list">
      <h3>Gastos ({expenses.length})</h3>

      <div className="expenses">
        {sortedExpenses.map((expense) => {
          const payer = getUserById(expense.paidBy);
          const isConfirming = deleteConfirmId === expense.id;

          return (
            <div key={expense.id} className={`expense-card ${isConfirming ? 'confirming' : ''}`}>
              <div className="expense-card-main">
                <div className={getAvatarClass(expense.paidBy)}>
                  {payer ? getInitials(payer.name) : '?'}
                </div>
                <div className="expense-card-content">
                  <div className="expense-card-title">{expense.title}</div>
                  <div className="expense-card-meta">
                    <span className="expense-card-payer">{payer?.name || 'Desconocido'}</span>
                    <span className="expense-card-date">{formatDate(expense.date)}</span>
                  </div>
                </div>
                <div className="expense-card-right">
                  <div className="expense-card-amount">
                    {getCurrencySymbol(expense.currency)}{expense.amount.toFixed(2)}
                  </div>
                  {isConfirming ? (
                    <div className="expense-card-confirm">
                      <button
                        onClick={() => handleConfirmDelete(expense.id)}
                        className="btn-confirm-yes"
                        title="Sí, eliminar"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleCancelDelete}
                        className="btn-confirm-no"
                        title="Cancelar"
                      >
                        ✗
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDeleteClick(expense.id)}
                      className="expense-card-delete"
                      title="Eliminar gasto"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div className="expense-card-split">
                {expense.splitType === 'equal' ? (
                  <span className="expense-split-info">
                    Dividido entre {expense.shares.length} persona{expense.shares.length !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <div className="expense-split-custom">
                    {expense.shares.map((share: ExpenseShare) => {
                      const user = getUserById(share.userId);
                      return (
                        <span key={share.userId} className="expense-share-item">
                          {user?.name}: {getCurrencySymbol(expense.currency)}{share.amount.toFixed(2)}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
