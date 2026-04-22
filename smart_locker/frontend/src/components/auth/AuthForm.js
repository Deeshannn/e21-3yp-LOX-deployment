import React from 'react';

const ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SUB_ADMIN: 'SUB_ADMIN',
  USER: 'USER'
};

function AuthForm({
  mode,
  form,
  onModeChange,
  onChange,
  onSubmit,
  onBootstrapSuperAdmin
}) {
  return (
    <div className="panel auth-panel">
      <h1>Smart Locker Platform</h1>
      <p>Database backed login and role-based control.</p>

      <div className="auth-switch">
        <button
          className={mode === 'login' ? 'active' : ''}
          onClick={() => onModeChange('login')}
        >
          Login
        </button>
        <button
          className={mode === 'register' ? 'active' : ''}
          onClick={() => onModeChange('register')}
        >
          Register
        </button>
      </div>

      <form onSubmit={onSubmit} className="grid-form">
        {mode === 'register' && (
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            required
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => onChange('email', e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => onChange('password', e.target.value)}
          required
        />

        {mode === 'register' && (
          <select
            value={form.role}
            onChange={(e) => onChange('role', e.target.value)}
          >
            <option value={ROLE.USER}>User</option>
            <option value={ROLE.SUB_ADMIN}>Sub Admin</option>
            <option value={ROLE.SUPER_ADMIN}>Super Admin</option>
          </select>
        )}

        {mode === 'register' && (
          <input
            placeholder="Station Code (optional, e.g. ST001)"
            value={form.stationCode}
            onChange={(e) => onChange('stationCode', e.target.value)}
          />
        )}

        {mode === 'register' && form.role !== ROLE.USER && (
          <input
            placeholder="Admin Invite Key"
            value={form.inviteKey}
            onChange={(e) => onChange('inviteKey', e.target.value)}
          />
        )}

        <button type="submit">{mode === 'login' ? 'Login' : 'Register'}</button>
      </form>

      <button className="secondary" onClick={onBootstrapSuperAdmin}>
        Bootstrap First Super Admin
      </button>
    </div>
  );
}

export default AuthForm;
