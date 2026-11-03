# Homeowner user guide

Draft · November 2, 2026 · Story #51 / Task #75

Use this guide for a homeowner account. Administrators may call this role
**Resident**. You can view only properties linked to your account, including
their inspection details and protected crew photos.

For signing in, changing your details/password and signing out, follow the
numbered [shared account instructions](account.md). Read the
[portal limitations](README.md#what-the-portal-does-not-do) before starting.

## H01 — Create an account — Available

You do not need your door tag to create an account.

1. Open the portal and select **Create homeowner account** to open `/sign-up/homeowner`.
2. Enter **Full name** and **Email address**.
3. Enter **Create a password** and **Confirm password**. Use at least 12 characters with upper- and lowercase letters, a number and a symbol; both entries must match. Follow any additional validation shown by the form.
4. Select **Create homeowner account** and wait for registration to finish.

Expected result: the portal signs you in and opens your homeowner page, which
shows **No properties on your account yet.** Follow H02 to add your property.

| Message under “We could not create your account” | What to do |
| --- | --- |
| “Passwords do not match.” | Re-enter matching passwords. This can also appear beside Confirm password. |
| “An account with this email already exists.” | Use Sign in if this is your account. |

Screenshot H01: pending registration screen.

## H02 — Add or remove a property — Available

To add a property:

1. Find the **Asset ID** printed on your assessment door tag. This is the Property ID used by the portal. Copy it exactly; do not substitute your street address or an inspection-point number. The precise printed location on the tag still needs confirmation against a real tag.
2. On your homeowner page, enter it under **Asset ID** and select **Add property**. Letter case and extra spaces do not matter.
3. Repeat for each property you own.

Expected result: **Added** and the Asset ID appear, and the property gets a card
under **Connected properties**. The Asset ID was checked against the City's
imported assessment data.

| Message | What to do |
| --- | --- |
| “We could not find that Asset ID. Check the number on your door tag.” | Compare the entry with the tag, including every letter and digit. If it persists, contact the Scottsdale Fire Department using the contact details supplied with your notice. Have the tag and ID ready. Do not guess another property's ID. |
| “This property is already on your account.” | Nothing more is needed; the property is already listed. |
| “You can link up to 25 properties. Contact the Scottsdale Fire Department if you need more.” | Contact the department, or remove a property you no longer need. |

The department may need to check whether the inspection data has been loaded;
the error alone does not prove the door tag is wrong. No support email address
or phone number has been confirmed for this guide.

To remove a property:

1. Select **Remove** on its card.
2. Select **Remove property** to confirm, or **Cancel** to keep it.

Expected result: the card disappears. Inspection records are not changed, and you
can add the property again later with the same Asset ID.

Screenshot H02: pending add form with a rejected-ID message, and the remove confirmation.

## H03 — See your connected properties — Available

1. [Sign in](account.md#c01--sign-in), or select **Home** in navigation if already signed in.
2. Find **Connected properties** and identify the card by **Asset ID**.
3. Read the inspection result, **Latest inspection**, season and address when present.
4. Select **View assessment** on the property you want to open. That link is shown when a season is recorded.

Expected result: each linked property has a card. **Issues found** means an
inspection recorded a concern; **No issues found** means the latest result
reported none; **Not inspected yet** means no result is available. These are
inspection results, not confirmation that an administrator has approved a fix.

If **No properties on your account yet.** appears, follow H02. If **We could not load your properties** appears, read the error
and select **Try again**.

Screenshot H03: pending connected-property cards and empty/error states.

## H04 — Read an assessment and crew photos — Available

1. From H03, select **View assessment**.
2. Check **Asset ID**, **Season** and the address when recorded. The heading uses the address when available, otherwise the Asset ID.
3. Read every item under **Inspection findings**. One property can contain several inspection points. Check each point's result, inspection date and **Inspection notes**.
4. If **Crew photos** are present, select a thumbnail to open its protected image in a new tab. Return to the assessment tab when finished.
5. Select **Back to my properties** to return to the homeowner page.

Expected result: the page shows the property's inspection points for the latest
recorded season. **Work needed** indicates at least one issue. The notes are
the inspector's recorded comments; ask the department about unclear findings.
Missing comments show **No comments were recorded for this inspection point.**
An absent photo section means no crew photos are listed for that point.

| Message | What to do |
| --- | --- |
| “We could not find an assessment for this property.” | Return to Connected properties and check the selected ID. The same message covers an unknown property and one you cannot access. |
| “We could not reach the assessment service. Check your connection and try again.” | Check your connection and select Try again. |
| “No inspection details recorded” | No inspection points are available for this record's current season; ask the department if you expect details. |

Screenshot H04: pending full assessment and enlarged crew photo, including an example with several inspection points.

## H05 — Mark an issue fixed with photos — Planned (#38, #44)

This action is absent from the reviewed build. The following is draft workflow
text, subject to the merged screens and the team's confirmation of photo limits.

1. Open your linked property's assessment and select an **open issue**. A point with **NO ISSUES** is not a fix-submission target.
2. Select the planned **Mark as fixed** action.
3. Choose 1–5 JPEG or PNG photos, each no larger than 5 MB. Review previews and remove any wrong file. Add an optional comment.
4. Submit once and wait for confirmation. If a validation error appears, correct it and retry.

Expected result after release: the submission and photos are saved and the
issue becomes **Pending review**. Uploading photos does not close an issue.
No-photo submissions, unsupported or disguised file types, oversized files,
more than five files and submissions for another property must be refused.
An already pending issue cannot receive another submission.

Pending review means an administrator must inspect the evidence. Check the
portal for progress; no email or text alert is planned. Actual submit labels,
confirmation and error messages must be recorded after #38 merges.

Screenshot H05: placeholder for the released picker, previews, limits, errors and successful pending state.

## H06 — Read status history and respond to a sent-back issue — Planned (#44, #39)

1. Open the assessment and find the issue's planned status/history area.
2. Read changes in date order, including the review decision and any reason.
3. If the administrator sends the issue back, read the reason and address the concern.
4. Once the issue is open again, follow H05 to submit new photos.

Expected result after release: **Open** awaits a fix, **Pending review** awaits
administrator review, and **Closed** means an administrator approved the fix.
“Sent back” is a review event returning the issue to Open, not a fourth status.
Earlier submissions remain part of the record. A closed issue cannot be reopened
in this sprint. The original ISSUES / NO ISSUES inspection result remains unchanged.

Screenshot H06: placeholder for dated history, pending/closed badges and a sent-back reason. Exact history labels and resubmission messages await the released screens.

## H07 — Request a full home assessment — Planned (#45)

1. Open your linked property's assessment.
2. Select the planned **Request a full home assessment** action.
3. Add an optional note and submit the request.
4. Check the displayed request date. If you try again while a request is open, use the existing request instead of expecting a second one.

Expected result after release: a dated confirmation is shown and the request
appears for administrators. A duplicate open request creates no additional
request. Another request is possible after the earlier one is handled.
This records interest; it does not schedule a visit. Staff recipients and
notification arrangements remain unconfirmed; no email alert is included.

Screenshot H07: placeholder for request form, dated confirmation and duplicate-request behavior. Confirm the planned “Requested on <date>” wording after release.

## Finish your session

Use [C02](account.md#c02--view-and-update-your-profile) to update your name or
phone, [C03](account.md#c03--change-your-password) to change your password,
and [C04](account.md#c04--sign-out) to sign out, especially on a shared device.
