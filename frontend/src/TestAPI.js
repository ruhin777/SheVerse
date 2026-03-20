
// frontend/src/TestAPI.js
import { useEffect, useState } from "react";

function TestAPI() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/")  // this is your backend API
      .then((res) => res.text())
      .then((data) => setMessage(data))
      .catch((err) => setMessage("Error: " + err));
  }, []);

  return <div>{message}</div>;
}

export default TestAPI;