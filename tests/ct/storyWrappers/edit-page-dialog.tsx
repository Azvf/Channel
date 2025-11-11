import React, { type ComponentProps } from 'react';
import { composeStories, setProjectAnnotations } from '@storybook/react';
import preview from '../../../.storybook/preview';
import * as EditPageDialogStories from '../../../src/popup/components/EditPageDialog.stories';

setProjectAnnotations(preview);

const composed = composeStories(EditPageDialogStories);

const ScrollLock = composed.ScrollLock;

export type ScrollLockStoryProps = ComponentProps<typeof ScrollLock>;

export const ScrollLockStory: React.FC<ScrollLockStoryProps> = (props) => (
  <ScrollLock {...ScrollLock.args} {...props} />
);
ScrollLockStory.displayName = 'ScrollLockStory';

