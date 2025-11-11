import { useState } from 'react';

import { TagInput } from '../../../src/popup/components/TagInput';

export interface ControlledTagInputProps {
  initialTags?: string[];
  suggestions?: string[];
  placeholder?: string;
}

export function ControlledTagInput({
  initialTags = [],
  suggestions = [],
  placeholder = '添加标签…',
}: ControlledTagInputProps) {
  const [tags, setTags] = useState(initialTags);
  return (
    <TagInput
      tags={tags}
      onTagsChange={setTags}
      suggestions={suggestions}
      placeholder={placeholder}
    />
  );
}

