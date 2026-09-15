import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSenhas } from '../context/SenhasContext';
import LoginLayout from './auth/LoginLayout';
import LoginForm from './auth/LoginForm';

export default function Login() {
  const { login } = useSenhas();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await login(email, password);
      if (response.success) {
        navigate('/', { replace: true });
      } else {
        setError(response.error || 'Credenciais inválidas.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginLayout
      title="Acesso ao Sistema"
      subtitle="Entre com seu e-mail e senha"
      colorScheme="primary"
      backPath="/"
    >
      <LoginForm onLogin={handleLogin} isLoading={isLoading} error={error} />
    </LoginLayout>
  );
}
