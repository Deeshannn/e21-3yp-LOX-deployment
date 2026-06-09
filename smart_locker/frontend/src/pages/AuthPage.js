import React from 'react';
import AuthForm from '../components/auth/AuthForm';
import AlertMessage from '../components/common/AlertMessage';

function AuthPage({
  mode,
  form,
  error,
  message,
  onModeChange,
  onChange,
  onSubmit,
  onBootstrapSuperAdmin,
  onClearError,
  onClearMessage
}) {
  const activeNotification = error
    ? { type: 'error', text: error, onClose: onClearError }
    : message
      ? { type: 'success', text: message, onClose: onClearMessage }
      : null;

  return (
    <div className="page auth-page">
      <div className="auth-shell">
        <section className="panel auth-hero-panel">
          <div className="auth-hero-badge">Smart Locker</div>
          <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p>
            A clean, role-aware workspace for locker access, station control, and live updates.
          </p>

          <div className="auth-hero-features">
            <div className="auth-feature-card">
              <strong>Secure access</strong>
              <span>Database-backed login and registration.</span>
            </div>
            <div className="auth-feature-card">
              <strong>Responsive layout</strong>
              <span>Built to stay polished on desktop and mobile.</span>
            </div>
            <div className="auth-feature-card">
              <strong>Role based control</strong>
              <span>Different flows for users, sub admins, and super admins.</span>
            </div>
          </div>
        </section>

        <AuthForm
          mode={mode}
          form={form}
          onModeChange={onModeChange}
          onChange={onChange}
          onSubmit={onSubmit}
          onBootstrapSuperAdmin={onBootstrapSuperAdmin}
        />
      </div>
      {activeNotification ? <AlertMessage {...activeNotification} /> : null}
    </div>
  );
}

export default AuthPage;
