import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCIES, type Expense, type ExpenseShare } from '../types';

interface ExpenseDetailModalProps {
  expense: Expense;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
}

/**
 * Popup de detalle de un gasto (o pago). Reutilizable: lo usan tanto la lista
 * de gastos como la sección de recurrentes del Resumen, para no duplicar lógica.
 */
export function ExpenseDetailModal({ expense, onClose, onEdit }: ExpenseDetailModalProps) {
  const { activeProject, getUserById, removeExpense, isClosed } = useApp();
  const [confirmingUnsettle, setConfirmingUnsettle] = useState(false);

  if (!activeProject) return null;
  const { users } = activeProject;

  const getCurrencySymbol = (code: string) =>
    CURRENCIES.find((c) => c.code === code)?.symbol || code;

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const formatDateLong = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const isSettlement = expense.expenseType === 'settlement';

  const handleClose = () => {
    setConfirmingUnsettle(false);
    onClose();
  };

  return (
    <div className="modal-overlay expense-detail-overlay" onClick={handleClose}>
      <div className="modal-content expense-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h4>{isSettlement ? 'Detalle del pago' : 'Detalle del gasto'}</h4>
          <button type="button" className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Importe y titulo */}
          <div className="expense-detail-hero">
            <div className="expense-detail-amount">
              {getCurrencySymbol(expense.currency)}{expense.amount.toFixed(2)}
            </div>
            <div className="expense-detail-title">{expense.title}</div>
          </div>

          {/* Info */}
          <div className="expense-detail-info">
            {isSettlement ? (
              <>
                <div className="expense-detail-row">
                  <span className="expense-detail-label">De</span>
                  <span className="expense-detail-value">
                    {getUserById(expense.paidBy)?.name || 'Desconocido'}
                  </span>
                </div>
                <div className="expense-detail-row">
                  <span className="expense-detail-label">A</span>
                  <span className="expense-detail-value">
                    {getUserById(expense.shares[0]?.userId)?.name || 'Desconocido'}
                  </span>
                </div>
              </>
            ) : (
              <div className="expense-detail-row">
                <span className="expense-detail-label">Pagado por</span>
                <span className="expense-detail-value">
                  {getUserById(expense.paidBy)?.name || 'Desconocido'}
                </span>
              </div>
            )}
            <div className="expense-detail-row">
              <span className="expense-detail-label">Fecha</span>
              <span className="expense-detail-value">{formatDateLong(expense.date)}</span>
            </div>
            {expense.expenseType === 'recurring' && (
              <div className="expense-detail-row">
                <span className="expense-detail-label">Frecuencia</span>
                <span className="expense-detail-value">
                  {expense.recurringFrequency === 'weekly' && 'Semanal'}
                  {expense.recurringFrequency === 'monthly' && 'Mensual'}
                  {expense.recurringFrequency === 'yearly' && 'Anual'}
                </span>
              </div>
            )}
          </div>

          {/* Notas (si existen) */}
          {expense.notes && (
            <div className="expense-detail-notes">
              <div className="expense-detail-notes-label">Notas</div>
              <p className="expense-detail-notes-text">{expense.notes}</p>
            </div>
          )}

          {/* Reparto (solo para gastos normales) */}
          {!isSettlement && (
            <div className="expense-detail-split">
              <div className="expense-detail-split-header">
                {expense.splitType === 'equal' ? 'Dividido a partes iguales' : 'Reparto personalizado'}
              </div>
              <div className="expense-detail-shares">
                {expense.shares.map((share: ExpenseShare) => {
                  const user = getUserById(share.userId);
                  const userIndex = users.findIndex((u) => u.id === share.userId);
                  return (
                    <div key={share.userId} className="expense-detail-share-row">
                      <div className={`avatar avatar-sm avatar-${((userIndex >= 0 ? userIndex : 0) % 8) + 1}`}>
                        {user ? getInitials(user.name) : '?'}
                      </div>
                      <span className="expense-detail-share-name">{user?.name || 'Desconocido'}</span>
                      <span className="expense-detail-share-amount">
                        {getCurrencySymbol(expense.currency)}{share.amount.toFixed(2)}
                      </span>
                      {expense.splitType === 'custom' && (
                        <span className="expense-detail-share-pct">
                          ({share.percentage.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {!isClosed && (
          <div className="modal-footer">
            {isSettlement ? (
              confirmingUnsettle ? (
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    onClick={() => { removeExpense(expense.id); handleClose(); }}
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setConfirmingUnsettle(false)}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger btn-block"
                  onClick={() => setConfirmingUnsettle(true)}
                >
                  Anular pago
                </button>
              )
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => { onClose(); onEdit(expense); }}
              >
                Editar gasto
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
