import { useApp } from '../context/AppContext';
import { CURRENCIES, type User } from '../types';

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export function Summary() {
  const { activeProject, getTotalExpenses, getUserBalance } = useApp();

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

  // Calculate settlements (who pays whom)
  const calculateSettlements = (): Settlement[] => {
    const balances = users.map(user => ({
      userId: user.id,
      name: user.name,
      balance: getUserBalance(user.id).balance
    }));

    const settlements: Settlement[] = [];

    // Separate into creditors (positive balance) and debtors (negative balance)
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

  const totalExpenses = getTotalExpenses();
  const settlements = calculateSettlements();

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="summary">
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
            {expenses.length} gasto{expenses.length !== 1 ? 's' : ''}
          </span>
          <span className="badge badge-neutral">
            {users.length} persona{users.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Sección de pagos pendientes */}
      {settlements.length > 0 && (
        <div className="settlements-section">
          <h4>Pagos pendientes</h4>
          <div className="settlements-list">
            {settlements.map((settlement, index) => {
              const fromUser = users.find(u => u.id === settlement.from);
              const toUser = users.find(u => u.id === settlement.to);
              const fromIndex = getUserIndex(settlement.from);
              const toIndex = getUserIndex(settlement.to);

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
            <p>Todos los gastos están saldados</p>
          </div>
        </div>
      )}

      {/* Balance por participante */}
      <h4>Balance por persona</h4>
      <div className="user-balances">
        {users.map((user: User, index: number) => {
          const balance = getUserBalance(user.id);
          const isPositive = balance.balance > 0.01;
          const isNegative = balance.balance < -0.01;

          return (
            <div key={user.id} className={`balance-card ${isPositive ? 'balance-card-positive' : ''} ${isNegative ? 'balance-card-negative' : ''}`}>
              <div className="balance-card-header">
                <div className={getAvatarClass(index)}>
                  {getInitials(user.name)}
                </div>
                <div className="balance-card-user">
                  <span className="balance-card-name">{user.name}</span>
                  <span className="balance-card-subtitle">
                    Pagó {getCurrencySymbol(defaultCurrency)}{balance.paid.toFixed(2)}
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
                  Corresponde: {getCurrencySymbol(defaultCurrency)}{balance.owes.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
