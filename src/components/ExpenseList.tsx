import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCIES, type Expense, type ExpenseShare } from '../types';

interface ExpenseListProps {
  onEditExpense: (expense: Expense) => void;
}

export function ExpenseList({ onEditExpense }: ExpenseListProps) {
  const { activeProject, getUserById, removeExpense, isClosed } = useApp();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);

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

  const formatDateLong = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
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

  const handleDeleteClick = (e: React.MouseEvent, expenseId: string) => {
    e.stopPropagation();
    setDeleteConfirmId(expenseId);
  };

  const handleConfirmDelete = (e: React.MouseEvent, expenseId: string) => {
    e.stopPropagation();
    removeExpense(expenseId);
    setDeleteConfirmId(null);
    // Si estamos viendo el detalle de este gasto, cerrarlo
    if (viewingExpense?.id === expenseId) {
      setViewingExpense(null);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(null);
  };

  const handleCardClick = (expense: Expense) => {
    if (deleteConfirmId) return; // No abrir detalle si hay confirmación de borrado activa
    setViewingExpense(expense);
  };

  const handleEdit = () => {
    if (viewingExpense) {
      setViewingExpense(null);
      onEditExpense(viewingExpense);
    }
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
          <p>Pulsa + para añadir tu primer gasto</p>
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
            <div
              key={expense.id}
              className={`expense-card ${isConfirming ? 'confirming' : ''}`}
              onClick={() => handleCardClick(expense)}
            >
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
                  {!isClosed && (
                    isConfirming ? (
                      <div className="expense-card-confirm">
                        <button
                          onClick={(e) => handleConfirmDelete(e, expense.id)}
                          className="btn-confirm-yes"
                          title="Si, eliminar"
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
                        onClick={(e) => handleDeleteClick(e, expense.id)}
                        className="expense-card-delete"
                        title="Eliminar gasto"
                      >
                        ×
                      </button>
                    )
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

      {/* Modal de detalle del gasto */}
      {viewingExpense && (
        <div className="modal-overlay" onClick={() => setViewingExpense(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Detalle del gasto</h4>
              <button
                type="button"
                className="modal-close"
                onClick={() => setViewingExpense(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* Importe y titulo */}
              <div className="expense-detail-hero">
                <div className="expense-detail-amount">
                  {getCurrencySymbol(viewingExpense.currency)}{viewingExpense.amount.toFixed(2)}
                </div>
                <div className="expense-detail-title">{viewingExpense.title}</div>
              </div>

              {/* Info */}
              <div className="expense-detail-info">
                <div className="expense-detail-row">
                  <span className="expense-detail-label">Pagado por</span>
                  <span className="expense-detail-value">
                    {(() => {
                      const payer = getUserById(viewingExpense.paidBy);
                      return payer?.name || 'Desconocido';
                    })()}
                  </span>
                </div>
                <div className="expense-detail-row">
                  <span className="expense-detail-label">Fecha</span>
                  <span className="expense-detail-value">{formatDateLong(viewingExpense.date)}</span>
                </div>
                {viewingExpense.expenseType === 'recurring' && (
                  <div className="expense-detail-row">
                    <span className="expense-detail-label">Frecuencia</span>
                    <span className="expense-detail-value">
                      {viewingExpense.recurringFrequency === 'weekly' && 'Semanal'}
                      {viewingExpense.recurringFrequency === 'monthly' && 'Mensual'}
                      {viewingExpense.recurringFrequency === 'yearly' && 'Anual'}
                    </span>
                  </div>
                )}
              </div>

              {/* Reparto */}
              <div className="expense-detail-split">
                <div className="expense-detail-split-header">
                  {viewingExpense.splitType === 'equal' ? 'Dividido a partes iguales' : 'Reparto personalizado'}
                </div>
                <div className="expense-detail-shares">
                  {viewingExpense.shares.map((share: ExpenseShare) => {
                    const user = getUserById(share.userId);
                    const userIndex = users.findIndex(u => u.id === share.userId);
                    return (
                      <div key={share.userId} className="expense-detail-share-row">
                        <div className={`avatar avatar-sm avatar-${((userIndex >= 0 ? userIndex : 0) % 8) + 1}`}>
                          {user ? getInitials(user.name) : '?'}
                        </div>
                        <span className="expense-detail-share-name">{user?.name || 'Desconocido'}</span>
                        <span className="expense-detail-share-amount">
                          {getCurrencySymbol(viewingExpense.currency)}{share.amount.toFixed(2)}
                        </span>
                        {viewingExpense.splitType === 'custom' && (
                          <span className="expense-detail-share-pct">
                            ({share.percentage.toFixed(0)}%)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {!isClosed && (
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={handleEdit}
                >
                  Editar gasto
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
