import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tag } from '../Tag';

describe('Tag component', () => {
  it('renders the provided label', () => {
    render(<Tag label="React" />);

    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', async () => {
    const onRemove = jest.fn();
    const user = userEvent.setup();

    render(<Tag label="React" onRemove={onRemove} />);

    const button = screen.getByRole('button', { name: /remove tag/i });
    await user.click(button);

    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

