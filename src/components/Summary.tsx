import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCIES, type User, type Expense } from '../types';
import { ExpenseDetailModal } from './ExpenseDetailModal';

interface SummaryProps {
  onEditExpense: (expense: Expense) => void;
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

type SummaryView = 'general' | 'monthly';

export function Summary({ onEditExpense }: SummaryProps) {
  const { activeProject, getTotalExpenses, getUserBalance, getExpensesByMonth, getUserById, settleDebt, canEdit, isClosed } = useApp();
  const [view, setView] = useState<SummaryView>('general');
  const [settlingKey, setSettlingKey] = useState<string | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [recurringExpanded, setRecurringExpanded] = useState(true);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);

  if (!activeProject) return null;

  const { users, expenses, defaultCurrency } = activeProject;

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find((c) => c.code === code)?.symbol || code;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarClass = (index: number) => {
    return `avatar avatar-${(index % 8) + 1}`;
  };

  const getUserIndex = (userId: string) => {
    return users.findIndex(u => u.id === userId);
  };

  // Calcular pagos pendientes
  const calculateSettlements = (): Settlement[] => {
    const balances = users.map(user => ({
      userId: user.id,
      name: user.name,
      balance: getUserBalance(user.id).balance
    }));

    const settlements: Settlement[] = [];
    const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
    const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);

    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(-debtor.balance, creditor.balance);

      if (amount > 0.01) {
        settlements.push({
          from: debtor.userId,
          to: creditor.userId,
          amount: amount
        });
      }

      debtor.balance += amount;
      creditor.balance -= amount;

      if (Math.abs(debtor.balance) < 0.01) i++;
      if (Math.abs(creditor.balance) < 0.01) j++;
    }

    return settlements;
  };

  // Funciones para vista mensual
  const formatMonthYear = (key: string) => {
    const [year, month] = key.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  };

  const totalExpenses = getTotalExpenses();
  const settlements = calculateSettlements();

  // Gastos recurrentes (para la sección del resumen)
  const recurringExpenses = expenses.filter(e => e.expenseType === 'recurring');
  const frequencyLabel = (f?: Expense['recurringFrequency']) =>
    f === 'weekly' ? 'Semanal' : f === 'yearly' ? 'Anual' : 'Mensual';

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="summary">
      {/* Toggle General / Por Mes */}
      <div className="summary-view-toggle">
        <button
          type="button"
          className={`summary-toggle-option ${view === 'general' ? 'selected' : ''}`}
          onClick={() => setView('general')}
        >
          General
        </button>
        <button
          type="button"
          className={`summary-toggle-option ${view === 'monthly' ? 'selected' : ''}`}
          onClick={() => setView('monthly')}
        >
          Por Mes
        </button>
      </div>

      {/* Header con total */}
      <div className="summary-header-card">
        <div className="summary-header-content">
          <span className="summary-header-label">Total gastado</span>
          <span className="summary-header-amount">
            {getCurrencySymbol(defaultCurrency)}{totalExpenses.toFixed(2)}
          </span>
        </div>
        <div className="summary-header-meta">
          <span className="badge badge-neutral">
            {expenses.filter(e => e.expenseType !== 'settlement').length} gasto{expenses.filter(e => e.expenseType !== 'settlement').length !== 1 ? 's' : ''}
          </span>
          <span className="badge badge-neutral">
            {users.length} persona{users.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Vista General */}
      {view === 'general' && (
        <>
          {/* Pagos pendientes */}
          {settlements.length > 0 && (
            <div className="settlements-section">
              <h4>Pagos pendientes</h4>
              <div className="settlements-list">
                {settlements.map((settlement, index) => {
                  const fromUser = users.find(u => u.id === settlement.from);
                  const toUser = users.find(u => u.id === settlement.to);
                  const fromIndex = getUserIndex(settlement.from);
                  const toIndex = getUserIndex(settlement.to);
                  const settlementKey = `${settlement.from}-${settlement.to}`;
                  const isConfirming = settlingKey === settlementKey;

                  return (
                    <div key={index} className="settlement-card">
                      <div className="settlement-from">
                        <div className={getAvatarClass(fromIndex)}>
                          {fromUser ? getInitials(fromUser.name) : '?'}
                        </div>
                        <span className="settlement-name">{fromUser?.name}</span>
                      </div>

                      <div className="settlement-arrow">
                        <span className="arrow-line"></span>
                        <span className="settlement-amount">
                          {getCurrencySymbol(defaultCurrency)}{settlement.amount.toFixed(2)}
                        </span>
                        <span className="arrow-head">→</span>
                      </div>

                      <div className="settlement-to">
                        <div className={getAvatarClass(toIndex)}>
                          {toUser ? getInitials(toUser.name) : '?'}
                        </div>
                        <span className="settlement-name">{toUser?.name}</span>
                      </div>

                      {canEdit && !isClosed && (
                        <div className="settlement-action">
                          {isConfirming ? (
                            <div className="settlement-confirm">
                              <span className="settlement-confirm-text">
                                ¿{fromUser?.name} ha pagado?
                              </span>
                              <button
                                className="btn-confirm-yes"
                                disabled={isSettling}
                                onClick={async () => {
                                  setIsSettling(true);
                                  await settleDebt(settlement.from, settlement.to, settlement.amount);
                                  setSettlingKey(null);
                                  setIsSettling(false);
                                }}
                              >
                                Si
                              </button>
                              <button
                                className="btn-confirm-no"
                                disabled={isSettling}
                                onClick={() => setSettlingKey(null)}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              className="settlement-settle-btn"
                              onClick={() => setSettlingKey(settlementKey)}
                            >
                              Saldar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {settlements.length === 0 && expenses.length > 0 && (
            <div className="settlements-section">
              <h4>Pagos pendientes</h4>
              <div className="all-settled">
                <span className="all-settled-icon">✓</span>
                <p>Todos los gastos estan saldados</p>
              </div>
            </div>
          )}

          {/* Balance por participante */}
          {/* Gastos recurrentes (solo si los hay) — sección plegable */}
          {recurringExpenses.length > 0 && (
            <div className="recurring-section">
              <button
                type="button"
                className="recurring-toggle"
                onClick={() => setRecurringExpanded((v) => !v)}
                aria-expanded={recurringExpanded}
              >
                <span className="recurring-toggle-title">🔁 Gastos recurrentes ({recurringExpenses.length})</span>
                <span className={`recurring-toggle-chevron ${recurringExpanded ? 'open' : ''}`}>▾</span>
              </button>
              {recurringExpanded && (
                <div className="recurring-list">
                  {recurringExpenses.map((expense) => (
                    <button
                      key={expense.id}
                      type="button"
                      className="recurring-card"
                      onClick={() => setViewingExpense(expense)}
                    >
                      <div className="recurring-card-info">
                        <span className="recurring-card-title">{expense.title}</span>
                        <span className="recurring-card-freq">{frequencyLabel(expense.recurringFrequency)}</span>
                      </div>
                      <span className="recurring-card-amount">
                        {getCurrencySymbol(expense.currency)}{expense.amount.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <h4>Balance por persona</h4>
          <div className="user-balances">
            {users.map((user: User, index: number) => {
              const balance = getUserBalance(user.id);
              const isPositive = balance.balance > 0.01;
              const isNegative = balance.balance < -0.01;
              // Calcular solo gastos reales (sin settlements) para el desglose
              const realExpenses = expenses.filter(e => e.expenseType !== 'settlement');
              const realPaid = realExpenses
                .filter(e => e.paidBy === user.id)
                .reduce((sum, e) => sum + e.amount, 0);
              const realOwes = realExpenses.reduce((sum, e) => {
                const share = e.shares.find(s => s.userId === user.id);
                return sum + (share?.amount || 0);
              }, 0);

              return (
                <div key={user.id} className={`balance-card ${isPositive ? 'balance-card-positive' : ''} ${isNegative ? 'balance-card-negative' : ''}`}>
                  <div className="balance-card-header">
                    <div className={getAvatarClass(index)}>
                      {getInitials(user.name)}
                    </div>
                    <div className="balance-card-user">
                      <span className="balance-card-name">{user.name}</span>
                      <span className="balance-card-subtitle">
                        Pago {getCurrencySymbol(defaultCurrency)}{realPaid.toFixed(2)}
                      </span>
                    </div>
                    <div className={`balance-card-amount ${isPositive ? 'positive' : ''} ${isNegative ? 'negative' : ''}`}>
                      {isPositive ? '+' : ''}{getCurrencySymbol(defaultCurrency)}{balance.balance.toFixed(2)}
                    </div>
                  </div>

                  <div className="balance-card-footer">
                    {isPositive && (
                      <span className="badge badge-success">Le deben</span>
                    )}
                    {isNegative && (
                      <span className="badge badge-danger">Debe</span>
                    )}
                    {!isPositive && !isNegative && (
                      <span className="badge badge-neutral">En paz</span>
                    )}
                    <span className="balance-card-detail">
                      Corresponde: {getCurrencySymbol(defaultCurrency)}{realOwes.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Vista Por Mes */}
      {view === 'monthly' && (
        <div className="monthly-view">
          {(() => {
            const expensesByMonth = getExpensesByMonth();
            if (expensesByMonth.size === 0) {
              return <p className="empty-message-inline">No hay gastos para mostrar.</p>;
            }
            return Array.from(expensesByMonth.entries()).map(([monthKey, monthExpenses]: [string, Expense[]]) => {
              const realMonthExpenses = monthExpenses.filter((e: Expense) => e.expenseType !== 'settlement');
              if (realMonthExpenses.length === 0) return null;
              const monthTotal = realMonthExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);
              return (
                <div key={monthKey} className="month-section">
                  <div className="month-header">
                    <span className="month-name">{formatMonthYear(monthKey)}</span>
                    <span className="month-total">
                      {getCurrencySymbol(defaultCurrency)} {monthTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="month-expenses">
                    {realMonthExpenses
                      .sort((a: Expense, b: Expense) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((expense: Expense) => {
                        const payer = getUserById(expense.paidBy);
                        return (
                          <button
                            key={expense.id}
                            type="button"
                            className="month-expense-item"
                            onClick={() => setViewingExpense(expense)}
                          >
                            <span className="expense-item-date">{formatDateShort(expense.date)}</span>
                            <div className="expense-item-info">
                              <span className="expense-item-title">{expense.title}</span>
                              <span className="expense-item-payer">Pagado por: {payer?.name || 'Desconocido'}</span>
                            </div>
                            <span className="expense-item-amount">
                              {getCurrencySymbol(expense.currency)} {expense.amount.toFixed(2)}
                            </span>
                          </button>
                        );
                      })}
                  </div>

                  <div className="month-stats">
                    <span>{realMonthExpenses.length} gasto{realMonthExpenses.length !== 1 ? 's' : ''}</span>
                    <span>Media: {getCurrencySymbol(defaultCurrency)} {(monthTotal / realMonthExpenses.length).toFixed(2)}</span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Detalle del gasto (al tocar un recurrente) */}
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
