import { useState } from 'react'
import './App.css'
import { Link } from 'react-router-dom'
// Profile image now loaded from public folder

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="welcome-container">
      <img src="/Profile1.jpg" alt="Exercise Example" className="exercise-image" />

      <h2>
        WHEREVER YOU ARE <span className="highlight">HEALTH</span> IS NUMBER ONE
      </h2>
      <p>There is no instant way to a healthy life</p>

      <div className="button-container">
        <Link to="/login" className="btn btn-login">LOGIN</Link>
        <Link to="/register" className="btn btn-register">REGISTER</Link>
      </div>
    </div>
  );
}
export default App
