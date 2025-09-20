import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MetricCard } from '../metric-card';
import { Building } from 'lucide-react';

describe('MetricCard', () => {
  const defaultProps = {
    title: 'Test Metric',
    value: '100 kWh',
    icon: Building,
  };

  it('renders with required props', () => {
    render(<MetricCard {...defaultProps} />);

    expect(screen.getByText('Test Metric')).toBeInTheDocument();
    expect(screen.getByText('100 kWh')).toBeInTheDocument();
  });

  it('renders delta when provided', () => {
    render(
      <MetricCard
        {...defaultProps}
        delta="+10%"
      />
    );

    expect(screen.getByText('+10%')).toBeInTheDocument();
  });

  it('applies correct color classes', () => {
    const { rerender } = render(
      <MetricCard
        {...defaultProps}
        color="success"
      />
    );

    const icon = document.querySelector('svg');
    expect(icon).toHaveClass('text-emerald-400');

    rerender(<MetricCard {...defaultProps} color="error" />);
    expect(document.querySelector('svg')).toHaveClass('text-red-400');
  });

  it('handles click events when onClick is provided', () => {
    const handleClick = jest.fn();
    render(
      <MetricCard
        {...defaultProps}
        onClick={handleClick}
      />
    );

    const card = screen.getByText('Test Metric').closest('.cursor-pointer');
    expect(card).toBeInTheDocument();

    fireEvent.click(card!);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not crash when rendered with minimal props', () => {
    expect(() => {
      render(<MetricCard title="Minimal" value={0} icon={Building} />);
    }).not.toThrow();
  });

  it('displays numeric values correctly', () => {
    render(
      <MetricCard
        {...defaultProps}
        value={12345}
      />
    );

    expect(screen.getByText('12345')).toBeInTheDocument();
  });
});