import { render, screen } from '@testing-library/react';
import App from './App';

test('renders platform title', () => {
  render(<App />);
  const titleElement = screen.getByText(/smart locker platform/i);
  expect(titleElement).toBeInTheDocument();
});
