import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagInput } from '../TagInput';

function TagInputHarness({ initialTags = [], suggestions = [] }: { initialTags?: string[]; suggestions?: string[] }) {
  const [tags, setTags] = useState<string[]>(initialTags);

  return (
    <TagInput
      tags={tags}
      onTagsChange={setTags}
      placeholder="Enter a tag..."
      suggestions={suggestions}
    />
  );
}

describe('TagInput component', () => {
  it('adds a new tag when pressing Enter', async () => {
    const user = userEvent.setup();

    render(<TagInputHarness />);

    const input = screen.getByPlaceholderText('Enter a tag...');
    await user.type(input, 'New Tag{enter}');

    await waitFor(() => {
      expect(screen.getByText('New Tag')).toBeInTheDocument();
    });
  });

  it('supports selecting suggestions with keyboard navigation', async () => {
    const user = userEvent.setup();

    render(<TagInputHarness suggestions={['React', 'Redux']} />);

    const input = screen.getByPlaceholderText('Enter a tag...');
    await user.type(input, 'Re');

    const suggestionButton = await screen.findByRole('button', { name: 'React' });
    expect(suggestionButton).toBeInTheDocument();

    await user.type(input, '{arrowDown}{enter}');

    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
    });
  });

  it('removes the last tag when pressing Backspace on empty input', async () => {
    const user = userEvent.setup();

    render(<TagInputHarness initialTags={['First', 'Second']} />);

    const input = screen.getByPlaceholderText('Enter a tag...');
    await user.click(input);
    await user.type(input, '{backspace}');

    expect(screen.queryByText('Second')).not.toBeInTheDocument();
    expect(screen.getByText('First')).toBeInTheDocument();
  });
});

