import React, { type ComponentProps } from 'react';
import { composeStories, setProjectAnnotations } from '@storybook/react';
import preview from '../../../.storybook/preview';
import * as ContextMenuStories from '../../../src/popup/components/ContextMenu.stories';

setProjectAnnotations(preview);

const composed = composeStories(ContextMenuStories);

const Default = composed.Default;

export type ContextMenuInteractiveProps = ComponentProps<typeof Default>;

export const ContextMenuInteractive: React.FC<ContextMenuInteractiveProps> = (props) => (
  <Default {...Default.args} {...props} />
);
ContextMenuInteractive.displayName = 'ContextMenuInteractive';


