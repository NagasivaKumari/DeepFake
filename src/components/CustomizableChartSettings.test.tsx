import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomizableChartSettings from './CustomizableChartSettings';

describe('CustomizableChartSettings Component', () => {
  test('renders without crashing', () => {
    render(<CustomizableChartSettings />);
    expect(screen.getByText('Customize Chart Settings')).toBeInTheDocument();
  });

  test('allows users to update chart title', () => {
    render(<CustomizableChartSettings />);
    const titleInput = screen.getByLabelText('Chart Title');
    fireEvent.change(titleInput, { target: { value: 'New Chart Title' } });
    expect(titleInput.value).toBe('New Chart Title');
  });

  test('allows users to toggle legend visibility', () => {
    render(<CustomizableChartSettings />);
    const legendCheckbox = screen.getByLabelText('Show Legend');
    fireEvent.click(legendCheckbox);
    expect(legendCheckbox.checked).toBe(true);
  });

  test('allows users to update data fields', () => {
    render(<CustomizableChartSettings />);
    const dataFieldInput = screen.getByLabelText('Data Field');
    fireEvent.change(dataFieldInput, { target: { value: 'New Data Field' } });
    expect(dataFieldInput.value).toBe('New Data Field');
  });
});