import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { CURRENCIES, type Expense, type ExpenseShare, type User, type ExpenseType, type RecurringFrequency } from '../types';

interface ExpenseFormProps {
  editExpense?: Expense | null;
  onClose: () => void;
}

export function ExpenseForm({ editExpense, onClose }: ExpenseFormProps) {
  const { activeProject, addExpense, updateExpense, isClosed } = useApp();

  const users = activeProject?.users ?? [];
  const defaultCurrency = activeProject?.defaultCurrency ?? 'EUR';

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [paidBy, setPaidBy] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customPercentages, setCustomPercentages] = useState<Record<string, number>>({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expenseType, setExpenseType] = useState<ExpenseType>('one-off');
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('monthly');
  const [recurringStartDate, setRecurringStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Inicializar campos UNA SOLA VEZ al montar (el ref evita que cambios
  // de referencia en users/editExpense reseteen la seleccion del usuario)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    if (users.length === 0) return; // esperar a que carguen los usuarios

    initializedRef.current = true;

    if (editExpense) {
      setAmount(editExpense.amount.toString());
      setTitle(editExpense.title);
      setCurrency(editExpense.currency);
      setPaidBy(editExpense.paidBy);
      setSelectedUsers(editExpense.shares.map(s => s.userId));
      setSplitType(editExpense.splitType);
      setDate(editExpense.date);
      setExpenseType(editExpense.expenseType || 'one-off');
      setRecurringFrequency(editExpense.recurringFrequency || 'monthly');
      setRecurringStartDate(editExpense.recurringStartDate || new Date().toISOString().split('T')[0]);
      if (editExpense.splitType === 'custom') {
        const percentages: Record<string, number> = {};
        editExpense.shares.forEach(s => { percentages[s.userId] = s.percentage; });
        setCustomPercentages(percentages);
      }
      if (editExpense.currency !== defaultCurrency) {
        setShowAdvanced(true);
      }
    } else {
      // Modo añadir: seleccionar todos los usuarios por defecto
      setSelectedUsers(users.map(u => u.id));
    }
  }, [editExpense, users, defaultCurrency]);

  if (!activeProject || isClosed) return null;

  const isEditing = !!editExpense;

  const handleUserToggle = (userId: string) => {
    setSelectedUsers((prev) => {
      // Si todos seleccionados y pinchas uno → solo ese
      if (prev.length === users.length) {
        return [userId];
      }
      // Si no, toggle normal
      return prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
    });
  };

  const handlePercentageChange = (userId: string, value: string) => {
    const num = parseFloat(value) || 0;
    setCustomPercentages((prev) => ({
      ...prev,
      [userId]: num,
    }));
  };

  const calculateShares = (): ExpenseShare[] => {
    if (selectedUsers.length === 0) return [];
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!amount || !title || !paidBy || selectedUsers.length === 0) {
      alert('Por favor, completa todos los campos obligatorios');
      return;
    }

    if (splitType === 'custom' && Math.abs(getTotalPercentage() - 100) > 0.01) {
      alert('Los porcentajes deben sumar 100%');
      return;
    }

    const expenseData = {
      amount: parseFloat(amount),
      title,
      currency,
      date: expenseType === 'recurring' ? recurringStartDate : date,
      paidBy,
      shares: calculateShares(),
      splitType,
      expenseType,
      ...(expenseType === 'recurring' && {
        recurringFrequency,
        recurringStartDate,
      }),
    };

    const success = isEditing
      ? await updateExpense(editExpense.id, expenseData)
      : await addExpense(expenseData);

    if (success) {
      onClose();
    } else {
      alert('Error al guardar el gasto. Intentalo de nuevo.');
    }
  };

  const getCurrencySymbol = () => {
    return CURRENCIES.find(c => c.code === currency)?.symbol || currency;
  };

  const getSplitSummary = () => {
    if (selectedUsers.length === 0) return 'Seleccionar';
    if (selectedUsers.length === users.length) return 'Todos';
    if (selectedUsers.length === 1) {
      const user = users.find(u => u.id === selectedUsers[0]);
      return user?.name || '1 persona';
    }
    return `${selectedUsers.length} personas`;
  };

  const getFrequencyLabel = (freq: RecurringFrequency) => {
    switch (freq) {
      case 'weekly': return 'Cada semana';
      case 'monthly': return 'Cada mes';
      case 'yearly': return 'Cada año';
    }
  };

  if (users.length === 0) {
    return (
      <div className="modal-overlay expense-form-overlay" onClick={onClose}>
        <div className="modal-content expense-form-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h4>{isEditing ? 'Editar Gasto' : 'Nuevo Gasto'}</h4>
            <button type="button" className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <div className="empty-message">
              <p>Añade participantes primero</p>
              <p>Ve a la pestaña "Participantes"</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay expense-form-overlay" onClick={onClose}>
      <div className="modal-content expense-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h4>{isEditing ? 'Editar Gasto' : 'Nuevo Gasto'}</h4>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            {/* Importe grande */}
            <div className="amount-input-container">
              <span className="currency-symbol">{getCurrencySymbol()}</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="amount-input"
                inputMode="decimal"
                autoFocus={!isEditing}
              />
            </div>

            {/* Titulo */}
            <div className="form-group">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Por ejemplo, supermercado"
                className="input"
              />
            </div>

            {/* Tipo de gasto */}
            <div className="form-group">
              <label>Tipo de gasto</label>
              <div className="expense-type-selector">
                <button
                  type="button"
                  className={`expense-type-option ${expenseType === 'one-off' ? 'selected' : ''}`}
                  onClick={() => setExpenseType('one-off')}
                >
                  Unico
                </button>
                <button
                  type="button"
                  className={`expense-type-option ${expenseType === 'recurring' ? 'selected' : ''}`}
                  onClick={() => setExpenseType('recurring')}
                >
                  Recurrente
                </button>
              </div>
            </div>

            {/* Opciones de recurrencia */}
            {expenseType === 'recurring' && (
              <div className="recurring-options">
                <div className="form-group">
                  <label>Frecuencia</label>
                  <div className="frequency-selector">
                    {(['weekly', 'monthly', 'yearly'] as RecurringFrequency[]).map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        className={`frequency-option ${recurringFrequency === freq ? 'selected' : ''}`}
                        onClick={() => setRecurringFrequency(freq)}
                      >
                        {getFrequencyLabel(freq)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Fecha de inicio</label>
                  <input
                    type="date"
                    value={recurringStartDate}
                    onChange={(e) => setRecurringStartDate(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            )}

            {/* Fila: Pagado por + Fecha */}
            <div className="form-row-2">
              <div className="form-group">
                <label>Pagado por</label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="input select-styled"
                >
                  <option value="">Seleccionar...</option>
                  {users.map((user: User) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              {expenseType === 'one-off' && (
                <div className="form-group">
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input"
                  />
                </div>
              )}
            </div>

            {/* Dividir entre */}
            <div className="form-group">
              <label>Dividir entre</label>
              <button
                type="button"
                className="input select-button"
                onClick={() => setShowSplitModal(true)}
              >
                <span>{getSplitSummary()}</span>
                <span className="select-arrow">▼</span>
              </button>
            </div>

            {/* Modal de reparto */}
            {showSplitModal && (
              <div className="modal-overlay split-modal-overlay" onClick={() => setShowSplitModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h4>Dividir entre</h4>
                    <button
                      type="button"
                      className="modal-close"
                      onClick={() => setShowSplitModal(false)}
                    >
                      ×
                    </button>
                  </div>

                  <div className="modal-body">
                    <div className="split-options-list">
                      <button
                        type="button"
                        className={`split-list-item ${selectedUsers.length === users.length ? 'selected' : ''}`}
                        onClick={() => setSelectedUsers(users.map(u => u.id))}
                      >
                        <span className="split-list-icon">👥</span>
                        <span>Todos</span>
                        <span className={`check ${selectedUsers.length === users.length ? '' : 'check-hidden'}`}>✓</span>
                      </button>

                      {users.map((user: User, index: number) => {
                        const isSelected = selectedUsers.includes(user.id);
                        return (
                          <button
                            key={user.id}
                            type="button"
                            className={`split-list-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleUserToggle(user.id)}
                          >
                            <span className={`split-list-avatar avatar-${(index % 8) + 1}`}>
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                            <span>{user.name}</span>
                            <span className={`check ${isSelected ? '' : 'check-hidden'}`}>✓</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Tipo de reparto */}
                    <div className="split-type-section">
                      <label>Tipo de reparto</label>
                      <div className="split-type-selector">
                        <button
                          type="button"
                          className={`split-type-option ${splitType === 'equal' ? 'selected' : ''}`}
                          onClick={() => setSplitType('equal')}
                        >
                          Partes iguales
                        </button>
                        <button
                          type="button"
                          className={`split-type-option ${splitType === 'custom' ? 'selected' : ''}`}
                          onClick={() => setSplitType('custom')}
                        >
                          Personalizado
                        </button>
                      </div>
                    </div>

                    {splitType === 'custom' && selectedUsers.length > 0 && (
                      <div className="percentage-inputs">
                        {selectedUsers.map((userId) => {
                          const user = users.find((u: User) => u.id === userId);
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
                                value={customPercentages[userId] ?? ''}
                                onChange={(e) => handlePercentageChange(userId, e.target.value)}
                                placeholder="0"
                                className="input input-small"
                                inputMode="decimal"
                              />
                              <span className="percentage-symbol">%</span>
                              <span className="percentage-amount">
                                = {getCurrencySymbol()}{calculatedAmount.toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                        <div className={`percentage-total ${Math.abs(getTotalPercentage() - 100) < 0.01 ? 'valid' : 'invalid'}`}>
                          Total: {getTotalPercentage().toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-primary btn-block"
                      onClick={() => setShowSplitModal(false)}
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Opciones avanzadas */}
            <button
              type="button"
              className="btn-link advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '▼ Menos opciones' : '▶ Cambiar moneda'}
            </button>

            {showAdvanced && (
              <div className="advanced-options">
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
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={!amount || !title || !paidBy || selectedUsers.length === 0}
            >
              {isEditing ? 'Guardar Cambios' : 'Añadir Gasto'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
