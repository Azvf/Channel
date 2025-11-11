import React, { type ComponentProps } from 'react';
import { composeStories, setProjectAnnotations } from '@storybook/react';
import preview from '../../../.storybook/preview';
import * as StatsWallModalStories from '../../../src/popup/components/StatsWallModal.stories';

setProjectAnnotations(preview);

const composed = composeStories(StatsWallModalStories);

const Default = composed.Default;
const Dense = composed.Dense;

export type StatsStoryProps = ComponentProps<typeof Default>;

export const StatsDefaultStory: React.FC<StatsStoryProps> = (props) => (
  <Default {...Default.args} {...props} />
);
StatsDefaultStory.displayName = 'StatsDefaultStory';

export const StatsDenseStory: React.FC<ComponentProps<typeof Dense>> = (props) => (
  <Dense {...Dense.args} {...props} />
);
StatsDenseStory.displayName = 'StatsDenseStory';

