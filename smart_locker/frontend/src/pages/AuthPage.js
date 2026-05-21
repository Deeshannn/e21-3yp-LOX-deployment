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
    <div className="page">
      <AuthForm
        mode={mode}
        form={form}
        onModeChange={onModeChange}
        onChange={onChange}
        onSubmit={onSubmit}
        onBootstrapSuperAdmin={onBootstrapSuperAdmin}
      />
      {activeNotification ? <AlertMessage {...activeNotification} /> : null}
    </div>
  );
}

export default AuthPage;
