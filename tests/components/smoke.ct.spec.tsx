import { test, expect } from './fixtures';
import { SimpleComponent } from './components/SimpleComponent';

test('mounts simple component', async ({ mount, page }) => {
  await mount(<SimpleComponent />);
  await expect(page.getByTestId('simple')).toHaveText('Hello');
});

