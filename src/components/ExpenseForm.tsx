import { useState, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCIES, type ExpenseShare } from '../types';

export function ExpenseForm() {
  const { state, addExpense } = useApp();
  const { users, defaultCurrency } = state.project;

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [paidBy, setPaidBy] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customPercentages, setCustomPercentages] = useState<Record<string, number>>({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleUserToggle = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handlePercentageChange = (userId: string, value: string) => {
    const num = parseFloat(value) || 0;
    setCustomPercentages((prev) => ({
      ...prev,
      [userId]: num,
    }));
  };

  const calculateShares = (): ExpenseShare[] => {
    const numAmount = parseFloat(amount) || 0;

    if (splitType === 'equal') {
      const equalPercentage = 100 / selectedUsers.length;
      const equalAmount = numAmount / selectedUsers.length;

      return selectedUsers.map((userId) => ({
        userId,
        percentage: equalPercentage,
        amount: equalAmount,
      }));
    } else {
      return selectedUsers.map((userId) => {
        const percentage = customPercentages[userId] || 0;
        return {
          userId,
          percentage,
          amount: (numAmount * percentage) / 100,
        };
      });
    }
  };

  const getTotalPercentage = () => {
    if (splitType === 'equal') return 100;
    return selectedUsers.reduce((sum, userId) => sum + (customPercentages[userId] || 0), 0);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!amount || !title || !paidBy || selectedUsers.length === 0) {
      alert('Por favor, completa todos los campos obligatorios');
      return;
    }

    if (splitType === 'custom' && Math.abs(getTotalPercentage() - 100) > 0.01) {
      alert('Los porcentajes deben sumar 100%');
      return;
    }

    addExpense({
      amount: parseFloat(amount),
      title,
      currency,
      date,
      paidBy,
      shares: calculateShares(),
      splitType,
    });

    // Reset form
    setAmount('');
    setTitle('');
    setSelectedUsers([]);
    setCustomPercentages({});
    setSplitType('equal');
  };

  if (users.length === 0) {
    return (
      <div className="expense-form">
        <h3>Registrar Gasto</h3>
        <p className="empty-message">Añade participantes primero para poder registrar gastos.</p>
      </div>
    );
  }

  return (
    <div className="expense-form">
      <h3>Registrar Gasto</h3>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Importe *</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="input input-large"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Moneda</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="input"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Título del gasto *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Cena en restaurante"
            className="input"
          />
        </div>

        <div className="form-group">
          <label>Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </div>

        <div className="form-group">
          <label>Pagado por *</label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="input"
          >
            <option value="">Selecciona quién pagó</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Personas involucradas *</label>
          <div className="checkbox-group">
            {users.map((user) => (
              <label key={user.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => handleUserToggle(user.id)}
                />
                {user.name}
              </label>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => setSelectedUsers(users.map((u) => u.id))}
          >
            Seleccionar todos
          </button>
        </div>

        {selectedUsers.length > 0 && (
          <div className="form-group">
            <label>Tipo de reparto</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="splitType"
                  value="equal"
                  checked={splitType === 'equal'}
                  onChange={() => setSplitType('equal')}
                />
                Partes iguales ({(100 / selectedUsers.length).toFixed(1)}% cada uno)
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="splitType"
                  value="custom"
                  checked={splitType === 'custom'}
                  onChange={() => setSplitType('custom')}
                />
                Porcentajes personalizados
              </label>
            </div>
          </div>
        )}

        {splitType === 'custom' && selectedUsers.length > 0 && (
          <div className="form-group">
            <label>Porcentajes</label>
            <div className="percentage-inputs">
              {selectedUsers.map((userId) => {
                const user = users.find((u) => u.id === userId);
                const percentage = customPercentages[userId] || 0;
                const calculatedAmount = ((parseFloat(amount) || 0) * percentage) / 100;
                return (
                  <div key={userId} className="percentage-row">
                    <span className="percentage-name">{user?.name}</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={customPercentages[userId] || ''}
                      onChange={(e) => handlePercentageChange(userId, e.target.value)}
                      placeholder="0"
                      className="input input-small"
                    />
                    <span className="percentage-symbol">%</span>
                    <span className="percentage-amount">
                      = {calculatedAmount.toFixed(2)} {currency}
                    </span>
                  </div>
                );
              })}
              <div className={`percentage-total ${Math.abs(getTotalPercentage() - 100) < 0.01 ? 'valid' : 'invalid'}`}>
                Total: {getTotalPercentage().toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-block">
          Registrar Gasto
        </button>
      </form>
    </div>
  );
}
