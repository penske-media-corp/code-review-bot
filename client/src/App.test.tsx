import { render, screen } from '@testing-library/react';
import App from './App';
import React from 'react';

test('renders not authenticated', () => {
  render(<App />);
  const signInElement = screen.getByText(/Sign in/i);
  expect(signInElement).toBeInTheDocument();
});
