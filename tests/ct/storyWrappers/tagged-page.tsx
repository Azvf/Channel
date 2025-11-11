import React, { type ComponentProps } from 'react';
import { composeStories, setProjectAnnotations } from '@storybook/react';
import preview from '../../../.storybook/preview';
import * as TaggedPageStories from '../../../src/popup/components/TaggedPage.stories';

setProjectAnnotations(preview);

const composed = composeStories(TaggedPageStories);

const Default = composed.Default;

export type TaggedPageStoryProps = ComponentProps<typeof Default>;

export const TaggedPageDefaultStory: React.FC<TaggedPageStoryProps> = (props) => (
  <Default {...Default.args} {...props} />
);
TaggedPageDefaultStory.displayName = 'TaggedPageDefaultStory';

