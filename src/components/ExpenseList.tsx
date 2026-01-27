import { useApp } from '../context/AppContext';
import { CURRENCIES } from '../types';

export function ExpenseList() {
  const { state, getUserById, removeExpense } = useApp();
  const { expenses } = state.project;

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find((c) => c.code === code)?.symbol || code;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (expenses.length === 0) {
    return (
      <div className="expense-list">
        <h3>Gastos</h3>
        <p className="empty-message">No hay gastos registrados todavía.</p>
      </div>
    );
  }

  return (
    <div className="expense-list">
      <h3>Gastos ({expenses.length})</h3>

      <div className="expenses">
        {sortedExpenses.map((expense) => {
          const payer = getUserById(expense.paidBy);
          return (
            <div key={expense.id} className="expense-card">
              <div className="expense-header">
                <div className="expense-amount">
                  {getCurrencySymbol(expense.currency)} {expense.amount.toFixed(2)}
                </div>
                <div className="expense-date">{formatDate(expense.date)}</div>
              </div>

              <div className="expense-title">{expense.title}</div>

              <div className="expense-details">
                <div className="expense-payer">
                  Pagado por: <strong>{payer?.name || 'Desconocido'}</strong>
                </div>

                <div className="expense-shares">
                  <span className="shares-label">Reparto:</span>
                  {expense.splitType === 'equal' ? (
                    <span className="share-equal">
                      Partes iguales entre {expense.shares.length} personas
                    </span>
                  ) : (
                    <ul className="share-list">
                      {expense.shares.map((share) => {
                        const user = getUserById(share.userId);
                        return (
                          <li key={share.userId}>
                            {user?.name}: {share.percentage.toFixed(1)}%
                            ({getCurrencySymbol(expense.currency)} {share.amount.toFixed(2)})
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              <button
                onClick={() => removeExpense(expense.id)}
                className="btn btn-danger btn-small expense-delete"
              >
                Eliminar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
