# System test scripts

Task #49 · Test plan and system test scripts · Author: Tejas Shah · Updated November 4, 2026

Thirteen end-to-end scripts that check the portal the way a homeowner and a department
administrator use it. Each script lists what it checks, the steps, and the exact result to
expect. They are black box tests: use only the browser. The plan they belong to is
[test-plan.md](test-plan.md).

The same steps are available as an automated runner, `run_system_tests.py` in this folder.
Running it and following the scripts by hand check the same results.

## Set up

1. Start the stack from the repository root with `docker compose up --build`. Open the
   portal at `http://localhost:3000`.
2. Load the test data into an empty database that has its migrations applied (the API
   container applies them when it starts):

   ```bash
   docker compose exec -T db psql -U fhv -d fire_hazard_veg < docs/testing/system-test-seed.sql
   ```

   The data is four invented properties. Do not load it twice; reset the database first.

   | Asset ID | Inspection points | Used for |
   | --- | --- | --- |
   | 9000001 | 2 issues: "Dead brush along the north fence", "Overhanging limbs near the roof" | the full review cycle |
   | 9000002 | 1 issue ("Woodpile against the house") and 1 point with no issues | an issue property that closes with one approval |
   | 9000003 | 1 point with no issues | a property that never needs photos |
   | 9000004 | 1 issue | a property that is never linked to the test account |

3. Create the administrator. The command asks for the password twice:

   ```bash
   docker compose exec api python -m app.cli.create_admin --email admin.demo@example.com --name "Dana Admin"
   ```

   The scripts below use the password `Walnut-Orbit-4821!` for the administrator and for the
   homeowner. Use any password that meets the rules if you choose another.
4. Use two browser windows, one signed in as the homeowner and one as the administrator, or
   use a private window for the second. Use any recent desktop Chrome.
5. Have three small image files ready: two real JPEG or PNG pictures (call them photo A and
   photo B), and one text file renamed to `notes.jpg`.

Run the scripts in order. Later scripts use accounts and data made by earlier ones. The
homeowner below is **Hannah Homeowner**, `hannah@example.com`.

## ST-01 Create a homeowner account

Checks that a person can register and starts with no properties.

1. Open `/sign-up/homeowner`. Enter Full name `Hannah Homeowner` and Email address
   `hannah@example.com`.
2. Enter `Walnut-Orbit-4821!` under **Create a password** and `Different-Orbit-1!` under
   **Confirm password**. Select **Create homeowner account**.
   **Expected:** the page stays on the sign-up form and shows that the passwords do not match.
3. Enter `Walnut-Orbit-4821!` under **Confirm password** and select **Create homeowner
   account** again.
   **Expected:** the portal opens `/homeowner`.
4. Read the page.
   **Expected:** it says **No properties on your account yet.**

Last result: pass, November 4, 2026.

## ST-02 Sign out and sign in

1. Open `/profile` and select **Sign out**.
   **Expected:** the portal opens `/sign-in`.
2. Enter `hannah@example.com` and the wrong password `Wrong-Pass-1234!`. Select **Sign in**.
   **Expected:** the message **Invalid email or password** appears.
3. Enter the correct password and select **Sign in**.
   **Expected:** the portal opens `/homeowner`.

Last result: pass, November 4, 2026.

## ST-03 Each role sees only its own pages

1. In the other window, sign in as `admin.demo@example.com`.
   **Expected:** the portal opens `/dashboard`.
2. In the homeowner window, open `/dashboard`.
   **Expected:** the portal sends you back to `/homeowner`.
3. In a window that is not signed in, open `/homeowner`.
   **Expected:** the portal sends you to `/sign-in`.

Last result: pass, November 4, 2026.

## ST-04 Add a property

Signed in as Hannah, on `/homeowner`:

1. Enter `9999999` under **Asset ID** and select **Add property**.
   **Expected:** **We could not find that Asset ID. Check the number on your door tag.**
2. Add `9000001`, then `9000002`, then `9000003`, one at a time.
   **Expected:** three property cards appear, one per Asset ID.
3. Add `9000001` again.
   **Expected:** **This property is already on your account.**

Last result: pass, November 4, 2026.

## ST-05 Property cards before any photos (#44)

Signed in as Hannah, on `/homeowner`. Then, as the administrator, open `/dashboard/hazards`.

1. Read the card for 9000001.
   **Expected:** **Issues found** and **Completion photos are still needed.**
2. Read the card for 9000002.
   **Expected:** the same two lines. Its point with no issues does not change the line.
3. Read the card for 9000003.
   **Expected:** **No issues found** and no line about photos or approval.
4. On the administrator's hazard map, look for the three properties.
   **Expected:** 9000001 and 9000002 are **Open**. 9000003 is not on the map.

Last result: pass, November 4, 2026.

## ST-06 View an assessment

1. On Hannah's `/homeowner`, select **View assessment** on the card for 9000001.
   **Expected:** the page shows **2 points**, with the notes "Dead brush along the north fence"
   and "Overhanging limbs near the roof".
2. Open `/homeowner/properties/9000004`, a property that is not on Hannah's account.
   **Expected:** **We could not find an assessment for this property.**

Last result: pass, November 4, 2026.

## ST-07 Submit completion photos

Run ST-08 first. It saves nothing, so these steps start from the same data.

1. Open the assessment for 9000001. Under inspection point 1, choose photo A and select
   **Submit for review**.
   **Expected:** the point shows a submission in its history.
2. Open `/homeowner`.
   **Expected:** the 9000001 card says **Photos submitted. Waiting for department review.**
3. As the administrator, open `/dashboard/hazards`.
   **Expected:** 9000001 is **Pending review**.
4. Back as Hannah, submit photo B for inspection point 2, then open the assessment for
   9000002 and submit photo A for its one issue.
   **Expected:** each assessment page shows **Submission history** with **Pending review**.

Last result: pass, November 4, 2026.

## ST-08 A file that is not a photo is refused

1. On the assessment for 9000001, choose `notes.jpg` and select **Submit for review**.
   **Expected:** **This photo could not be read. Choose a valid JPEG or PNG.**
2. Open `/homeowner` and read the 9000001 card.
   **Expected:** its line is unchanged (nothing was saved).

Last result: pass, November 4, 2026.

## ST-09 Administrator review inbox

As the administrator, open `/dashboard/reviews` after ST-07 step 4.

1. Read the inbox.
   **Expected:** the inbox count is 3. Each entry reads "Hannah Homeowner submitted
   completion photos", and the three entries show Asset 9000001 (twice) and Asset 9000002.

Last result: pass, November 4, 2026.

## ST-10 Send a submission back

1. In the inbox, select **Review submission** on an entry for 9000001.
2. Choose **Send back — more work or evidence needed** and select **Save decision** without
   writing a comment.
   **Expected:** nothing is saved. The page stays on the same submission.
3. Enter the comment `Photo does not show the fence line. Please retake.` and select
   **Save decision**.
   **Expected:** the inbox opens and shows **Review saved** and **The issue was sent back
   and remains open.**
4. As Hannah, open `/homeowner`.
   **Expected:** the 9000001 card still says **Photos submitted. Waiting for department
   review.** because its other point is still waiting.
5. As Hannah, open the assessment for 9000001.
   **Expected:** the history shows **Sent back** and the department comment.

Last result: pass, November 4, 2026.

## ST-11 Approve, mixed states, and resubmit

The card and the hazard map must always agree. A property is **Pending review** while any of
its issues waits for review, **Closed** only when every issue's latest photos are approved,
and **Open** otherwise.

1. As the administrator, review the other 9000001 submission and choose **Approve**, then
   **Save decision**.
   **Expected:** the inbox shows **The issue was approved and marked closed.**
2. As Hannah, open `/homeowner`. As the administrator, open `/dashboard/hazards`.
   **Expected:** the 9000001 card says **Completion photos are still needed.** (one point
   was sent back) and the map shows 9000001 **Open**.
3. As the administrator, approve the 9000002 submission.
   **Expected:** the 9000002 card says **Approved by the department.** and the map shows
   9000002 **Closed**.
4. As Hannah, open the assessment for 9000001 and submit photo A for the sent-back point.
   **Expected:** the 9000001 card says **Photos submitted. Waiting for department review.**
5. As the administrator, approve that submission.
   **Expected:** both the 9000001 and 9000002 cards say **Approved by the department.** and
   the map shows both **Closed**. The card still says **Issues found**, because the crew's
   inspection result does not change.

Last result: pass, November 4, 2026.

## ST-12 Full assessment request

1. As Hannah, open the assessment for 9000003. Enter `Please check the back slope too.`
   under **Note (optional)** and select **Request full assessment**.
2. As the administrator, open `/dashboard/assessment-requests`.
   **Expected:** an open request for Asset 9000003, "Requested by Hannah Homeowner".
3. Select **Mark handled**, then select the **Handled** filter.
   **Expected:** the request appears under **Handled**.

Last result: pass, November 4, 2026.

## ST-13 Administrator user list

1. As the administrator, open `/dashboard/users`.
   **Expected:** Hannah Homeowner is listed as a Resident, Active. Her **Asset IDs** column
   shows 9000001, 9000002 and **+1** for the third.

Last result: pass, November 4, 2026.

## Result log

| Date | Run | Environment | Result |
| --- | --- | --- | --- |
| November 4, 2026 | Automated runner, branch `dev` after pull request #39 | desktop Chromium, local stack, seed data | 41 of 41 steps passed |

Add a row for each later run. Write what failed, with the script ID and step, instead of
"pass" when a step fails. Hand runs on a phone or another browser are not recorded yet.
