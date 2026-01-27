import { useApp } from '../context/AppContext';
import { CURRENCIES } from '../types';

export function Summary() {
  const { state, getTotalExpenses, getUserBalance } = useApp();
  const { users, expenses, defaultCurrency } = state.project;

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find((c) => c.code === code)?.symbol || code;
  };

  const totalExpenses = getTotalExpenses();

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="summary">
      <h3>Resumen del Proyecto</h3>

      <div className="summary-total">
        <span className="summary-label">Total de gastos:</span>
        <span className="summary-amount">
          {getCurrencySymbol(defaultCurrency)} {totalExpenses.toFixed(2)}
        </span>
      </div>

      <div className="summary-count">
        <span>{expenses.length} gasto{expenses.length !== 1 ? 's' : ''} registrado{expenses.length !== 1 ? 's' : ''}</span>
      </div>

      <h4>Balance por participante</h4>

      <div className="user-balances">
        {users.map((user) => {
          const balance = getUserBalance(user.id);
          const isPositive = balance.balance > 0;
          const isNegative = balance.balance < 0;

          return (
            <div key={user.id} className="user-balance-card">
              <div className="balance-name">{user.name}</div>

              <div className="balance-details">
                <div className="balance-row">
                  <span>Ha pagado:</span>
                  <span className="balance-paid">
                    {getCurrencySymbol(defaultCurrency)} {balance.paid.toFixed(2)}
                  </span>
                </div>
                <div className="balance-row">
                  <span>Le corresponde:</span>
                  <span className="balance-owes">
                    {getCurrencySymbol(defaultCurrency)} {balance.owes.toFixed(2)}
                  </span>
                </div>
                <div className={`balance-row balance-total ${isPositive ? 'positive' : ''} ${isNegative ? 'negative' : ''}`}>
                  <span>Balance:</span>
                  <span>
                    {isPositive ? '+' : ''}{getCurrencySymbol(defaultCurrency)} {balance.balance.toFixed(2)}
                  </span>
                </div>
              </div>

              {isPositive && (
                <div className="balance-status positive">
                  Le deben {getCurrencySymbol(defaultCurrency)} {balance.balance.toFixed(2)}
                </div>
              )}
              {isNegative && (
                <div className="balance-status negative">
                  Debe {getCurrencySymbol(defaultCurrency)} {Math.abs(balance.balance).toFixed(2)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
