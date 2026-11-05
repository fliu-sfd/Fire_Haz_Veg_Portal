"""System test runner for docs/testing/system-test-scripts.md (task #49).

Drives the portal in a real browser and checks the expected result of every step in
scripts ST-01 to ST-13. It keeps going after a failed step and exits 1 if any step failed.

Author: Tejas Shah

Needs a running stack on a database that was freshly migrated and seeded with
docs/testing/system-test-seed.sql, plus an admin account (see the scripts document):
    pip install playwright pillow
    playwright install chromium
    python docs/testing/run_system_tests.py

Settings come from environment variables, with these defaults:
    PORTAL_WEB_URL    http://localhost:3000
    PORTAL_API_URL    http://localhost:8000/api/v1
    PORTAL_ADMIN_EMAIL / PORTAL_PASSWORD    admin account made for the test run
"""
import os, re, sys, tempfile, time
from PIL import Image
from playwright.sync_api import sync_playwright

WEB = os.environ.get("PORTAL_WEB_URL", "http://localhost:3000")
API = os.environ.get("PORTAL_API_URL", "http://localhost:8000/api/v1")
PW = os.environ.get("PORTAL_PASSWORD", "Walnut-Orbit-4821!")
ADMIN = os.environ.get("PORTAL_ADMIN_EMAIL", "admin.demo@example.com")
HOME = f"home.{int(time.time())}@example.com"
_tmp = tempfile.mkdtemp(prefix="st-photos-")
IMG_A, IMG_B, BAD = (os.path.join(_tmp, n) for n in ("fence.jpg", "limbs.jpg", "notes.jpg"))
Image.new("RGB", (800, 600), (120, 160, 90)).save(IMG_A)
Image.new("RGB", (800, 600), (200, 140, 60)).save(IMG_B)
with open(BAD, "w") as fh:
    fh.write("this is text, not a picture")
results = []

def check(tid, step, ok, seen=""):
    results.append((tid, step, ok))
    print(f"{'PASS' if ok else 'FAIL'}  {tid}  {step}" + ("" if ok else f"   saw: {seen[:200]!r}"))

def body(pg): return pg.inner_text("body")
def sign_in(pg, email, pw=PW):
    pg.goto(WEB + "/sign-in"); pg.get_by_label("Email address").fill(email); pg.locator("#sign-in-password").fill(pw)
    pg.get_by_role("button", name="Sign in").click(); pg.wait_for_timeout(2500)
def sign_out(pg):
    pg.goto(WEB + "/profile"); pg.get_by_role("button", name="Sign out").first.click(); pg.wait_for_timeout(2000)
def card(pg, aid):
    pg.goto(WEB + "/homeowner"); pg.wait_for_timeout(2500)
    return pg.locator("article, li, div").filter(has_text=aid).last.inner_text()
def map_state(admin_pg, aid):
    d = admin_pg.request.get(API + "/admin/hazards").json()
    return {i["asset_id"]: i["state"] for i in d["items"]}.get(aid, "not on map")
def submit_photo(pg, aid, img, expect_ok=True):
    pg.goto(WEB + f"/homeowner/properties/{aid}"); pg.wait_for_timeout(2500)
    pg.locator("input[type=file]").nth(0).set_input_files(img)
    pg.get_by_role("button", name="Submit for review").nth(0).click(); pg.wait_for_timeout(2500)
def decide(admin_pg, aid, decision, comment=""):
    admin_pg.goto(WEB + "/dashboard/reviews"); admin_pg.wait_for_timeout(2500)
    row = admin_pg.locator("li, article").filter(has_text=aid).filter(has=admin_pg.get_by_role("link", name="Review submission")).first
    row.get_by_role("link", name="Review submission").click(); admin_pg.wait_for_timeout(2500)
    admin_pg.get_by_label("Approve" if decision == "approved" else "Send back").check()
    if comment: admin_pg.get_by_label("Department comment").fill(comment)
    admin_pg.get_by_role("button", name="Save decision").click(); admin_pg.wait_for_timeout(2500)

with sync_playwright() as p:
    br = p.chromium.launch()
    h = br.new_context(viewport={"width": 1200, "height": 1000}).new_page()
    a = br.new_context(viewport={"width": 1200, "height": 1000}).new_page()

    # ST-01 create account
    h.goto(WEB + "/sign-up/homeowner")
    h.get_by_label("Full name").fill("Hannah Homeowner"); h.get_by_label("Email address").fill(HOME)
    h.get_by_label("Create a password").fill(PW); h.get_by_label("Confirm password").fill("Different-Orbit-1!")
    h.get_by_role("button", name="Create").first.click(); h.wait_for_timeout(1500)
    check("ST-01", "mismatched passwords are refused", "/sign-up/homeowner" in h.url and "do not match" in body(h).lower(), body(h)[-300:])
    h.get_by_label("Confirm password").fill(PW); h.get_by_role("button", name="Create").first.click(); h.wait_for_timeout(3000)
    check("ST-01", "matching passwords create the account and open /homeowner", h.url.endswith("/homeowner"), h.url)
    check("ST-01", "new account has no properties", "No properties on your account yet." in body(h), body(h)[:300])

    # ST-02 sign in / out
    sign_out(h); check("ST-02", "sign out returns to /sign-in", h.url.endswith("/sign-in"), h.url)
    sign_in(h, HOME, "Wrong-Pass-1234!")
    check("ST-02", "wrong password shows 'Invalid email or password'", "Invalid email or password" in body(h), body(h)[-300:])
    sign_in(h, HOME); check("ST-02", "correct password opens /homeowner", h.url.endswith("/homeowner"), h.url)

    # ST-03 protected pages
    sign_in(a, ADMIN); check("ST-03", "admin sign-in opens /dashboard", a.url.endswith("/dashboard"), a.url)
    h.goto(WEB + "/dashboard"); h.wait_for_timeout(2500)
    check("ST-03", "homeowner opening /dashboard is sent back to /homeowner", h.url.endswith("/homeowner"), h.url)
    anon = br.new_context().new_page(); anon.goto(WEB + "/homeowner"); anon.wait_for_timeout(2500)
    check("ST-03", "signed-out visitor opening /homeowner is sent to /sign-in", anon.url.endswith("/sign-in"), anon.url)

    # ST-04 add property
    h.goto(WEB + "/homeowner"); h.wait_for_timeout(2000)
    def add(aid): h.get_by_label("Asset ID").fill(aid); h.get_by_role("button", name="Add property").click(); h.wait_for_timeout(1800)
    add("9999999"); check("ST-04", "unknown Asset ID is refused with the door-tag message", "We could not find that Asset ID. Check the number on your door tag." in body(h), body(h)[:400])
    for aid in ("9000001", "9000002", "9000003"): add(aid)
    check("ST-04", "three valid Asset IDs show three cards", all(x in body(h) for x in ("9000001", "9000002", "9000003")), body(h)[:400])
    add("9000001"); check("ST-04", "adding the same Asset ID again says it is already on the account", "This property is already on your account." in body(h), body(h)[:400])

    # ST-05 card lines before any photos
    c1, c2, c3 = card(h, "9000001"), card(h, "9000002"), card(h, "9000003")
    check("ST-05", "issue property shows 'Completion photos are still needed.'", "Completion photos are still needed." in c1, c1)
    check("ST-05", "second issue property shows the same line (its no-issue point is ignored)", "Completion photos are still needed." in c2, c2)
    check("ST-05", "property with no issues shows no evidence line", "No issues found" in c3 and "photos" not in c3.lower() and "Approved by the department" not in c3, c3)
    check("ST-05", "map shows both issue properties Open and the clean one absent", (map_state(a, "9000001"), map_state(a, "9000002"), map_state(a, "9000003")) == ("open", "open", "not on map"))

    # ST-06 assessment page
    h.goto(WEB + "/homeowner/properties/9000001"); h.wait_for_timeout(2500); t = body(h)
    check("ST-06", "assessment page lists 2 inspection points with crew notes", "2 points" in t and "Dead brush along the north fence" in t and "Overhanging limbs near the roof" in t, t[:400])
    h.goto(WEB + "/homeowner/properties/9000004"); h.wait_for_timeout(2500)
    check("ST-06", "a property not on the account cannot be opened", "We could not find an assessment for this property." in body(h), body(h)[:300])

    # ST-07 / ST-08 submit photos
    submit_photo(h, "9000001", BAD)
    check("ST-08", "a file that is not an image is refused", "This photo could not be read. Choose a valid JPEG or PNG." in body(h), body(h)[-400:])
    check("ST-08", "refused file leaves the card unchanged", "Completion photos are still needed." in card(h, "9000001"))
    submit_photo(h, "9000001", IMG_A)
    check("ST-07", "one point submitted: card says 'Photos submitted. Waiting for department review.'", "Photos submitted. Waiting for department review." in card(h, "9000001"))
    check("ST-07", "one point submitted: map shows Pending review", map_state(a, "9000001") == "pending_review", map_state(a, "9000001"))
    submit_photo(h, "9000001", IMG_B); submit_photo(h, "9000002", IMG_A)
    h.goto(WEB + "/homeowner/properties/9000001"); h.wait_for_timeout(2500)
    check("ST-07", "submission history is shown on the assessment page", "Submission history" in body(h) and "Pending review" in body(h), body(h)[:300])

    # ST-09 admin inbox
    a.goto(WEB + "/dashboard/reviews"); a.wait_for_timeout(2500); t = body(a)
    check("ST-09", "review inbox lists 3 submissions with homeowner name and asset", "Hannah Homeowner submitted completion photos" in t and "Asset 9000001" in t and "Asset 9000002" in t, t[:400])
    check("ST-09", "inbox count is 3", re.search(r"Review inbox\s*\n?\s*3\b", t) is not None, t[:200])

    # ST-10 send back
    a.goto(WEB + "/dashboard/reviews"); a.wait_for_timeout(2000)
    row = a.locator("li, article").filter(has_text="9000001").filter(has=a.get_by_role("link", name="Review submission")).first
    row.get_by_role("link", name="Review submission").click(); a.wait_for_timeout(2500); url = a.url
    a.get_by_label("Send back").check(); a.get_by_role("button", name="Save decision").click(); a.wait_for_timeout(1500)
    check("ST-10", "sending back without a comment does not save", a.url == url, a.url)
    a.get_by_label("Department comment").fill("Photo does not show the fence line. Please retake."); a.get_by_role("button", name="Save decision").click(); a.wait_for_timeout(2500)
    check("ST-10", "with a comment the decision saves and returns to the inbox", re.fullmatch(r".*/dashboard/reviews(\?.*)?", a.url) is not None, a.url)
    check("ST-10", "inbox confirms 'Review saved' and that the issue was sent back and remains open", "Review saved" in body(a) and "The issue was sent back and remains open." in body(a), body(a)[:500])
    check("ST-10", "other 9000001 point still pending, so card stays 'Photos submitted…'", "Photos submitted. Waiting for department review." in card(h, "9000001"))
    h.goto(WEB + "/homeowner/properties/9000001"); h.wait_for_timeout(2500); t = body(h)
    check("ST-10", "homeowner sees 'Sent back' and the department comment", "Sent back" in t and "Photo does not show the fence line. Please retake." in t, t[:600])

    # ST-11 approve, mixed states, resubmit
    decide(a, "9000001", "approved")
    check("ST-11", "inbox confirms 'The issue was approved and marked closed.'", "The issue was approved and marked closed." in body(a), body(a)[:500])
    check("ST-11", "one point approved, one sent back: card says photos still needed", "Completion photos are still needed." in card(h, "9000001"))
    check("ST-11", "same state on the map is Open", map_state(a, "9000001") == "open", map_state(a, "9000001"))
    decide(a, "9000002", "approved")
    check("ST-11", "all issue points approved: card says 'Approved by the department.'", "Approved by the department." in card(h, "9000002"))
    check("ST-11", "same property is Closed on the map", map_state(a, "9000002") == "closed", map_state(a, "9000002"))
    submit_photo(h, "9000001", IMG_A)
    check("ST-11", "resubmitting a sent-back point makes the card pending again", "Photos submitted. Waiting for department review." in card(h, "9000001"))
    decide(a, "9000001", "approved")
    check("ST-11", "after the last approval the card says 'Approved by the department.'", "Approved by the department." in card(h, "9000001"))
    check("ST-11", "map shows both issue properties Closed", (map_state(a, "9000001"), map_state(a, "9000002")) == ("closed", "closed"))

    # ST-12 full assessment request
    h.goto(WEB + "/homeowner/properties/9000003"); h.wait_for_timeout(2500)
    h.get_by_label("Note (optional)").fill("Please check the back slope too.")
    h.get_by_role("button", name="Request full assessment").click(); h.wait_for_timeout(3000)
    a.goto(WEB + "/dashboard/assessment-requests"); a.wait_for_timeout(2500); t = body(a)
    check("ST-12", "admin sees an Open request for Asset 9000003 from the homeowner", "Asset 9000003" in t and "Requested by Hannah Homeowner" in t, t[:500])
    a.locator("li, article").filter(has_text="9000003").first.get_by_role("button", name="Mark handled").click(); a.wait_for_timeout(2500)
    a.get_by_role("button", name="Handled", exact=True).click(); a.wait_for_timeout(1500)
    check("ST-12", "marked handled: request shows under Handled", "Asset 9000003" in body(a), body(a)[:400])

    # ST-13 admin users list
    a.goto(WEB + "/dashboard/users"); a.get_by_text("Hannah Homeowner").first.wait_for(timeout=15000); t = a.inner_text("main")
    check("ST-13", "users list shows the homeowner with two Asset IDs and '+1' for the third", "Hannah Homeowner" in t and "9000001" in t and "9000002" in t and "+1" in t, t[:600])
    br.close()

bad = [r for r in results if not r[2]]
print(f"\n{len(results)-len(bad)} of {len(results)} steps passed")
sys.exit(1 if bad else 0)
