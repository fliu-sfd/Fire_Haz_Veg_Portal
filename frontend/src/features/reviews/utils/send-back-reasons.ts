export type SendBackReason = { id: string; label: string; text: string };

/** Longest review comment the API accepts. */
export const REVIEW_COMMENT_MAX_LENGTH = 2000;

/**
 * Ready-made Send back reasons. Edit wording or add reasons here only.
 * `label` is shown on the chip; `text` is the sentence the homeowner sees.
 */
export const SEND_BACK_REASONS: readonly SendBackReason[] = [
  { id: "blurry", label: "Photo is blurry", text: "The photo is blurry. Please retake it in good light and make sure the area is in focus." },
  { id: "incomplete", label: "Work not complete", text: "The work does not look complete. Please finish clearing the area and upload new photos." },
  { id: "wrong-area", label: "Wrong area", text: "The photo does not show the area from the inspection. Please photograph the location listed in the inspection." },
  { id: "too-far", label: "Too far away", text: "The photo is too far away to verify the work. Please take a closer photo of the area." },
  { id: "more-photos", label: "Not enough photos", text: "Please add more photos so the whole area can be seen from different angles." },
  { id: "debris", label: "Debris still on site", text: "Cut vegetation or debris is still on the property. Please remove it and upload new photos." },
];

export function hasReason(comment: string, reason: SendBackReason): boolean {
  return comment.includes(reason.text);
}

/**
 * Returns the comment with the reason's sentence added: as the whole comment when
 * it is blank, otherwise on a new line. Returns the comment unchanged when the
 * sentence is already there or the result would exceed `maxLength`.
 */
export function addReason(comment: string, reason: SendBackReason, maxLength = REVIEW_COMMENT_MAX_LENGTH): string {
  if (hasReason(comment, reason)) return comment;
  const existing = comment.trimEnd();
  const next = existing ? `${existing}\n${reason.text}` : reason.text;
  return next.length > maxLength ? comment : next;
}

/** True when tapping the reason would change the comment. */
export function canAddReason(comment: string, reason: SendBackReason, maxLength = REVIEW_COMMENT_MAX_LENGTH): boolean {
  return addReason(comment, reason, maxLength) !== comment;
}
