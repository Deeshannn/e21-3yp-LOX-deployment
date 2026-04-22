import React from 'react';
import AuthForm from '../components/auth/AuthForm';
import AlertMessage from '../components/common/AlertMessage';

function AuthPage({ mode, form, error, message, onModeChange, onChange, onSubmit, onBootstrapSuperAdmin }) {
  return (
    <div className="page">
      <AuthForm
        mode={mode}
        form={form}
        onModeChange={onModeChange}
        onChange={onChange}
        onSubmit={onSubmit}
        onBootstrapSuperAdmin={onBootstrapSuperAdmin}
      />
      <AlertMessage type="error" text={error} />
      <AlertMessage type="success" text={message} />
    </div>
  );
}

export default AuthPage;
