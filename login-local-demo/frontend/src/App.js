import React, { useState } from 'react';
import axios from 'axios';

export default function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [message, setMessage] = useState('');

  const login = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/login', { username, password });
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      setMessage('Login successful!');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Login failed');
    }
  };

  const register = async () => {
    try {
      await axios.post('http://localhost:5000/api/register', { username, password });
      setMessage('Registration successful, please login');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    setToken('');
    localStorage.removeItem('token');
    setMessage('Logged out');
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: 20 }}>
      {!token ? (
        <>
          <h2>Login</h2>
          <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} /><br /><br />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} /><br /><br />
          <button onClick={login}>Sign In</button>
          <button onClick={register} style={{ marginLeft: 10 }}>Register</button>
          <p>{message}</p>
        </>
      ) : (
        <>
          <h2>Welcome, {username}</h2>
          <button onClick={logout}>Logout</button>
          <p>{message}</p>
        </>
      )}
    </div>
  );
}