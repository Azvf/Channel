import React, { type ComponentProps } from 'react';
import { composeStories, setProjectAnnotations } from '@storybook/react';
import preview from '../../../.storybook/preview';
import * as TagInputStories from '../../../src/popup/components/TagInput.stories';

setProjectAnnotations(preview);

const composed = composeStories(TagInputStories);

const Interactive = composed.Interactive;

export type TagInputInteractiveProps = ComponentProps<typeof Interactive>;

export const TagInputInteractive: React.FC<TagInputInteractiveProps> = (props) => (
  <Interactive {...Interactive.args} {...props} />
);
TagInputInteractive.displayName = 'TagInputInteractive';

