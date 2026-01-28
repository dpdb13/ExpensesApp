import { useApp } from '../context/AppContext';
import { CURRENCIES } from '../types';

export function MonthlySummary() {
  const { activeProject, getExpensesByMonth, getUserById } = useApp();

  if (!activeProject) return null;

  const { defaultCurrency } = activeProject;

  const expensesByMonth = getExpensesByMonth();

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find((c) => c.code === code)?.symbol || code;
  };

  const formatMonthYear = (key: string) => {
    const [year, month] = key.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  if (expensesByMonth.size === 0) {
    return (
      <div className="monthly-summary">
        <h3>Gastos por Mes</h3>
        <p className="empty-message">No hay gastos para mostrar.</p>
      </div>
    );
  }

  return (
    <div className="monthly-summary">
      <h3>Gastos por Mes</h3>

      {Array.from(expensesByMonth.entries()).map(([monthKey, monthExpenses]) => {
        const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

        return (
          <div key={monthKey} className="month-section">
            <div className="month-header">
              <span className="month-name">{formatMonthYear(monthKey)}</span>
              <span className="month-total">
                {getCurrencySymbol(defaultCurrency)} {monthTotal.toFixed(2)}
              </span>
            </div>

            <div className="month-expenses">
              {monthExpenses
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((expense) => {
                  const payer = getUserById(expense.paidBy);
                  return (
                    <div key={expense.id} className="month-expense-item">
                      <span className="expense-item-date">{formatDate(expense.date)}</span>
                      <span className="expense-item-title">{expense.title}</span>
                      <span className="expense-item-payer">({payer?.name})</span>
                      <span className="expense-item-amount">
                        {getCurrencySymbol(expense.currency)} {expense.amount.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
            </div>

            <div className="month-stats">
              <span>{monthExpenses.length} gasto{monthExpenses.length !== 1 ? 's' : ''}</span>
              <span>Media: {getCurrencySymbol(defaultCurrency)} {(monthTotal / monthExpenses.length).toFixed(2)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
