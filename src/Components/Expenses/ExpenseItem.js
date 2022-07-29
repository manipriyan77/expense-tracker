import ExpenseDate from "./ExpenseDate";
import "./ExpenseItem.css";
import Card from "../UI/Card";
import { useState } from 'react';

function ExpenseItem(props) {
  // let title=props.title;
  const [title,setTitle]=useState(props.title)

  const changeTitleHandler =()=>{
    setTitle("Updated")
    console.log(title)
  }
  return (
    <Card className="expense-item" key={props.id}>
      <ExpenseDate date={props.date} />
      <div className="expense-item__description">
        <h2>{title}</h2>
        <div className="expense-item__price">${props.amount}</div>
      </div>
      <button onClick={()=>changeTitleHandler()}>Change title</button>
    </Card>
  );
}

export default ExpenseItem;
