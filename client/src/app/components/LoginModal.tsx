import React, { useState } from 'react';
import { login, register } from '../../services/authService';

interface LoginModalProps {
  onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isRegister) {
        const res = await register({ name, email, password });
        if (res.ok) {
          setIsRegister(false);
        } else {
          setError('No se pudo registrar.');
        }
      } else {
        const res = await login(email, password);
        if (res.ok) {
          onLoginSuccess();
        } else {
          setError('Usuario o contraseña incorrectos.');
        }
      }
    } catch (err) {
      setError('Error de red.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold mb-4 text-center">
          {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Nombre"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none"
              required
            />
          )}
          <input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none"
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none"
            required
          />
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <button
            type="submit"
            className="w-full px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold mt-2 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Procesando...' : isRegister ? 'Registrarse' : 'Entrar'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button
            type="button"
            className="text-indigo-600 hover:underline text-sm"
            onClick={() => setIsRegister(r => !r)}
          >
            {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>
      </div>
    </div>
  );
};
