import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { expect, test } from 'vitest';

function Button() {
  return <button>Guardar</button>;
}

test('renderiza botón', () => {
  render(<Button />);

  expect(
    screen.getByRole('button', { name: /guardar/i })
  ).toBeInTheDocument();
});