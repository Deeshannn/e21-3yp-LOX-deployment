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
    <div className="panel auth-card">
      <div className="auth-card-header">
        <div>
          <p className="auth-card-kicker">{mode === 'login' ? 'Sign in' : 'Sign up'}</p>
          <h2>{mode === 'login' ? 'Access your dashboard' : 'Create a new account'}</h2>
          <p className="auth-card-copy">
            {mode === 'login'
              ? 'Use your registered email and password to continue.'
              : 'Add your details to create a role-based locker account.'}
          </p>
        </div>
      </div>

      <div className="auth-switch" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          className={mode === 'login' ? 'active' : ''}
          onClick={() => onModeChange('login')}
        >
          Sign in
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'active' : ''}
          onClick={() => onModeChange('register')}
        >
          Sign up
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
          placeholder="Email address"
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
            placeholder="Station code (optional, e.g. ST001)"
            value={form.stationCode}
            onChange={(e) => onChange('stationCode', e.target.value)}
          />
        )}

        {mode === 'register' && form.role !== ROLE.USER && (
          <input
            placeholder="Admin invite key"
            value={form.inviteKey}
            onChange={(e) => onChange('inviteKey', e.target.value)}
          />
        )}

        <button type="submit">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>

      <button className="secondary" onClick={onBootstrapSuperAdmin}>
        Bootstrap First Super Admin
      </button>
    </div>
  );
}

export default AuthForm;
