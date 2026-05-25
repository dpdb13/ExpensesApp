import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCIES, type Expense, type ExpenseShare } from '../types';
import { ExpenseDetailModal } from './ExpenseDetailModal';

interface ExpenseListProps {
  onEditExpense: (expense: Expense) => void;
}

export function ExpenseList({ onEditExpense }: ExpenseListProps) {
  const { activeProject, getUserById, removeExpense, isClosed, myMemberId } = useApp();
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

  // Mi perspectiva en un gasto. Devuelve null si aún no me he vinculado
  // (en ese caso la tarjeta muestra el importe total, como antes).
  type Perspective =
    | { kind: 'none' }              // No has participado
    | { kind: 'lent'; amount: number }   // Te deben
    | { kind: 'owe'; amount: number }    // Debes
    | { kind: 'paid-self' };        // Pagaste (solo para ti)

  const getMyPerspective = (expense: Expense): Perspective | null => {
    if (!myMemberId) return null;
    const myShare = expense.shares.find((s) => s.userId === myMemberId);
    const iPaid = expense.paidBy === myMemberId;
    if (!myShare && !iPaid) return { kind: 'none' };
    if (iPaid) {
      const owed = expense.amount - (myShare?.amount ?? 0);
      return owed > 0.005 ? { kind: 'lent', amount: owed } : { kind: 'paid-self' };
    }
    return { kind: 'owe', amount: myShare!.amount };
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
      <h3>Gastos ({expenses.filter(e => e.expenseType !== 'settlement').length})</h3>

      <div className="expenses">
        {sortedExpenses.map((expense) => {
          const payer = getUserById(expense.paidBy);
          const isConfirming = deleteConfirmId === expense.id;
          const isSettlement = expense.expenseType === 'settlement';
          const perspective = isSettlement ? null : getMyPerspective(expense);
          const iPaid = expense.paidBy === myMemberId;
          const symbol = getCurrencySymbol(expense.currency);
          const total = expense.amount.toFixed(2);
          // Texto del pagador: con perspectiva, incluye el total; si no, solo el nombre
          const payerText = isSettlement
            ? 'Deuda saldada'
            : perspective
              ? (iPaid ? `Tú pagaste ${symbol}${total}` : `${payer?.name || 'Desconocido'} pagó ${symbol}${total}`)
              : (payer?.name || 'Desconocido');

          return (
            <div
              key={expense.id}
              className={`expense-card ${isConfirming ? 'confirming' : ''} ${isSettlement ? 'settlement' : ''}`}
              onClick={() => handleCardClick(expense)}
            >
              <div className="expense-card-main">
                {isSettlement ? (
                  <div className="avatar avatar-sm avatar-settlement">✓</div>
                ) : (
                  <div className={getAvatarClass(expense.paidBy)}>
                    {payer ? getInitials(payer.name) : '?'}
                  </div>
                )}
                <div className="expense-card-content">
                  <div className="expense-card-title">{expense.title}</div>
                  <div className="expense-card-meta">
                    <span className="expense-card-payer">{payerText}</span>
                    <span className="expense-card-date">{formatDate(expense.date)}</span>
                  </div>
                </div>
                <div className="expense-card-right">
                  {perspective ? (
                    perspective.kind === 'none' ? (
                      <div className="expense-card-perspective no-participado">No has participado</div>
                    ) : perspective.kind === 'paid-self' ? (
                      <div className="expense-card-perspective is-neutral">Pagaste</div>
                    ) : (
                      <div className="expense-card-perspective">
                        <span className="expense-perspective-label">
                          {perspective.kind === 'lent' ? 'Te deben' : 'Debes'}
                        </span>
                        <span className={`expense-perspective-amount ${perspective.kind === 'lent' ? 'is-tedeben' : 'is-debes'}`}>
                          {symbol}{perspective.amount.toFixed(2)}
                        </span>
                      </div>
                    )
                  ) : (
                    <div className="expense-card-amount">
                      {symbol}{total}
                    </div>
                  )}
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
                        title={isSettlement ? 'Anular pago' : 'Eliminar gasto'}
                      >
                        ×
                      </button>
                    )
                  )}
                </div>
              </div>

              {!isSettlement && (
                <div className="expense-card-split">
                  <div className="expense-card-split-info">
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
                  {(expense.expenseType === 'recurring' || expense.recurringParentId) && (
                    <span className="expense-recurring-badge" title="Gasto recurrente" aria-label="Gasto recurrente">🔁</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de detalle del gasto (componente reutilizable) */}
      {viewingExpense && (
        <ExpenseDetailModal
          expense={viewingExpense}
          onClose={() => setViewingExpense(null)}
          onEdit={onEditExpense}
        />
      )}
    </div>
  );
}
