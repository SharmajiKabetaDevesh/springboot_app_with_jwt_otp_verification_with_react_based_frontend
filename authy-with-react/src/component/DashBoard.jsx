import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [content, setContent] = useState("");

  useEffect(() => {
    axios.get("http://localhost:8080/api/test/all", { withCredentials: true })
      .then(res => setContent(res.data))
      .catch(() => setContent("You are not authorized."));
  }, []);

  return (
    <div>
      <h2>Dashboard</h2>
      <p>{content}</p>
    </div>
  );
}
