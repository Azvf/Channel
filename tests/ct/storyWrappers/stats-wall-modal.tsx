import React, { type ComponentProps } from 'react';
import { composeStories, setProjectAnnotations } from '@storybook/react';
import preview from '../../../.storybook/preview';
import * as StatsWallModalStories from '../../../src/popup/components/StatsWallModal.stories';

setProjectAnnotations(preview);

const composed = composeStories(StatsWallModalStories);

const Default = composed.Default;
const Dense = composed.Dense;
const Empty = composed.Empty;
const VeryHeavy = composed.VeryHeavy;
const SingleDay = composed.SingleDay;
const OldActivity = composed.OldActivity;
const RecentOnly = composed.RecentOnly;
const Sparse = composed.Sparse;
const Closed = composed.Closed;

export type StatsStoryProps = ComponentProps<typeof Default>;

export const StatsDefaultStory: React.FC<StatsStoryProps> = (props) => (
  <Default {...Default.args} {...props} />
);
StatsDefaultStory.displayName = 'StatsDefaultStory';

export const StatsDenseStory: React.FC<ComponentProps<typeof Dense>> = (props) => (
  <Dense {...Dense.args} {...props} />
);
StatsDenseStory.displayName = 'StatsDenseStory';

export const StatsEmptyStory: React.FC<ComponentProps<typeof Empty>> = (props) => (
  <Empty {...Empty.args} {...props} />
);
StatsEmptyStory.displayName = 'StatsEmptyStory';

export const StatsVeryHeavyStory: React.FC<ComponentProps<typeof VeryHeavy>> = (props) => (
  <VeryHeavy {...VeryHeavy.args} {...props} />
);
StatsVeryHeavyStory.displayName = 'StatsVeryHeavyStory';

export const StatsSingleDayStory: React.FC<ComponentProps<typeof SingleDay>> = (props) => (
  <SingleDay {...SingleDay.args} {...props} />
);
StatsSingleDayStory.displayName = 'StatsSingleDayStory';

export const StatsOldActivityStory: React.FC<ComponentProps<typeof OldActivity>> = (props) => (
  <OldActivity {...OldActivity.args} {...props} />
);
StatsOldActivityStory.displayName = 'StatsOldActivityStory';

export const StatsRecentOnlyStory: React.FC<ComponentProps<typeof RecentOnly>> = (props) => (
  <RecentOnly {...RecentOnly.args} {...props} />
);
StatsRecentOnlyStory.displayName = 'StatsRecentOnlyStory';

export const StatsSparseStory: React.FC<ComponentProps<typeof Sparse>> = (props) => (
  <Sparse {...Sparse.args} {...props} />
);
StatsSparseStory.displayName = 'StatsSparseStory';

export const StatsClosedStory: React.FC<ComponentProps<typeof Closed>> = (props) => (
  <Closed {...Closed.args} {...props} />
);
StatsClosedStory.displayName = 'StatsClosedStory';

