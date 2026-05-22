import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { LoginModal } from '../../src/app/components/LoginModal';
import { login, register } from '../../src/services/authService';

vi.mock('../../src/services/authService', () => ({
  login: vi.fn(),
  register: vi.fn(),
}));

const mockedLogin = vi.mocked(login);
const mockedRegister = vi.mocked(register);

describe('Pruebas de GUI - LoginModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('muestra el formulario inicial de inicio de sesión', () => {
    render(<LoginModal onLoginSuccess={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/correo/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /regístrate/i })).toBeInTheDocument();
  });

  test('cambia visualmente al formulario de registro', () => {
    render(<LoginModal onLoginSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /regístrate/i }));

    expect(screen.getByRole('heading', { name: /crear cuenta/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrarse/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /inicia sesión/i })).toBeInTheDocument();
  });

  test('permite iniciar sesión y ejecuta onLoginSuccess cuando las credenciales son válidas', async () => {
    mockedLogin.mockResolvedValueOnce({ ok: true, data: { token: 'fake-token' } } as any);
    const onLoginSuccess = vi.fn();

    render(<LoginModal onLoginSuccess={onLoginSuccess} />);

    fireEvent.change(screen.getByPlaceholderText(/correo/i), {
      target: { value: 'estudiante@priorix.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/contraseña/i), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockedLogin).toHaveBeenCalledWith('estudiante@priorix.com', '123456');
      expect(onLoginSuccess).toHaveBeenCalledTimes(1);
    });
  });

  test('muestra mensaje de error cuando el inicio de sesión falla', async () => {
    mockedLogin.mockResolvedValueOnce({ ok: false } as any);

    render(<LoginModal onLoginSuccess={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/correo/i), {
      target: { value: 'error@priorix.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/contraseña/i), {
      target: { value: 'incorrecta' },
    });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/usuario o contraseña incorrectos/i)).toBeInTheDocument();
  });

  test('permite registrarse y vuelve al formulario de inicio de sesión si el registro fue exitoso', async () => {
    mockedRegister.mockResolvedValueOnce({ ok: true, data: { id: 1 } } as any);

    render(<LoginModal onLoginSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /regístrate/i }));
    fireEvent.change(screen.getByPlaceholderText(/nombre/i), {
      target: { value: 'Estudiante Priorix' },
    });
    fireEvent.change(screen.getByPlaceholderText(/correo/i), {
      target: { value: 'nuevo@priorix.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/contraseña/i), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /registrarse/i }));

    await waitFor(() => {
      expect(mockedRegister).toHaveBeenCalledWith({
        name: 'Estudiante Priorix',
        email: 'nuevo@priorix.com',
        password: '123456',
      });
      expect(screen.getByRole('heading', { name: /iniciar sesión/i })).toBeInTheDocument();
    });
  });
});
