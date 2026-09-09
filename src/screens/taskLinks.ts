// Shared encoding for the task link picker, used by both the create form
// (TasksScreen) and the edit form (TaskEditForm) so the "field:id" / "livestock:id"
// convention lives in exactly one place.

import type { Task } from '../data';
import type { TaskLinkOption } from '../data/tasks';

/** The picker's "no link" sentinel value. */
export const NO_LINK = '';

/** Encodes a link option as the picker value "kind:id". */
export const encodeLink = (option: TaskLinkOption): string => `${option.kind}:${option.id}`;

/** Splits a picker value back into the field/animal ids the domain expects. */
export function decodeLink(value: string): { fieldId?: string; livestockId?: string } {
  if (value === NO_LINK) return {};
  const [kind, id] = value.split(':');
  return kind === 'field' ? { fieldId: id } : { livestockId: id };
}

/** The picker value that matches a task's current link, or NO_LINK when it has none. */
export function currentLinkValue(task: Task): string {
  if (task.fieldId) return `field:${task.fieldId}`;
  if (task.livestockId) return `livestock:${task.livestockId}`;
  return NO_LINK;
}
