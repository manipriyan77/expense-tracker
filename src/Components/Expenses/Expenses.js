import ExpenseItem from "./ExpenseItem";
import "./Expenses.css";
import Card from "../UI/Card";

const Expenses = (props) => {
  return (
    <Card className="expenses">
      {props.expenses.map((expense) => {
        return (
          <ExpenseItem
            key={expense.id}
            title={expense.title}
            id={expense.id}
            amount={expense.amount}
            date={expense.date}
          />
        );
      })}
    </Card>
  );
};

export default Expenses;
