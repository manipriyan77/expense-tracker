import { useState } from "react";
import Expenses from "./Components/Expenses/Expenses";
import NewExpense from "./Components/NewExpense/NewExpense";
const DUMMY_EXPNESES = [
  {
    id: "e1",
    title: "Toilet Paper",
    amount: 94.12,
    date: new Date(2025, 7, 14),
  },
  { id: "e2", title: "New TV", amount: 799.49, date: new Date(2024, 2, 12) },
  {
    id: "e3",
    title: "Car Insurance",
    amount: 294.67,
    date: new Date(2024, 2, 28),
  },
  {
    id: "e4",
    title: "New Desk (Wooden)",
    amount: 450,
    date: new Date(2022, 5, 12),
  },
];

function App() {
  const [expenses, setExpenses] = useState(DUMMY_EXPNESES);
  const addExpenseHandler = (expense) => {
    // setExpenses([expense, ...expenses]);
    //If your state update depends on previous state use it in a function
    setExpenses((preExpenses) => {
      return [expense, ...preExpenses];
    });
  };
  return (
    <div>
      <NewExpense onAddExpense={addExpenseHandler} />
      <Expenses expenses={expenses} />
    </div>
  );
}

export default App;
