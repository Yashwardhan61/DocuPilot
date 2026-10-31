import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthModal from '../../components/Auth/AuthModal';
import { AuthProvider } from '../../context/AuthContext';

describe('AuthModal component', () => {
  test('renders login tab by default and disables submit button when fields are invalid', () => {
    render(
      <AuthProvider>
        <AuthModal />
      </AuthProvider>
    );
    // login tab button should have selected state
    const loginTab = screen.getByRole('button', { name: /sign in/i });
    expect(loginTab).toHaveAttribute('aria-selected', 'true');
    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    expect(submitBtn).toBeDisabled();
    // fill valid email and password
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    expect(submitBtn).not.toBeDisabled();
  });

  test('switches to signup tab and validates fields', () => {
    render(
      <AuthProvider>
        <AuthModal />
      </AuthProvider>
    );
    const signUpTab = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(signUpTab);
    expect(signUpTab).toHaveAttribute('aria-selected', 'true');
    const submitBtn = screen.getByRole('button', { name: /create account/i });
    expect(submitBtn).toBeDisabled();
    // fill fields
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'pass1234' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'pass1234' } });
    expect(submitBtn).not.toBeDisabled();
  });
});

