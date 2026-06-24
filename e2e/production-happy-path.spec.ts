import { expect, test } from "@playwright/test";

const baseUrl = process.env.FAMILYAPP_E2E_BASE_URL?.trim();
const parentEmail = process.env.FAMILYAPP_E2E_PARENT_EMAIL?.trim();
const parentMagicLink = process.env.FAMILYAPP_E2E_PARENT_MAGIC_LINK?.trim();
const setupToken = process.env.FAMILYAPP_E2E_SETUP_TOKEN?.trim();

test.describe("private production happy path", () => {
  test.skip(!baseUrl, "Set FAMILYAPP_E2E_BASE_URL to run the production smoke test.");

  test("requests a Parent magic link without exposing Household details", async ({
    page,
  }) => {
    test.skip(!parentEmail, "Set FAMILYAPP_E2E_PARENT_EMAIL.");
    if (!parentEmail) throw new Error("FAMILYAPP_E2E_PARENT_EMAIL is required.");

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Private Family App" })).toBeVisible();
    await expect(page.getByText("Household name")).toHaveCount(0);

    await page.getByLabel("Parent email").fill(parentEmail);
    await page.getByRole("button", { name: /Send sign-in link/i }).click();
    await expect(page.getByRole("status")).toBeVisible();
  });

  test("runs first setup, Child PIN work, Parent approval, Rewards, Points, and Weekly Review", async ({
    page,
  }) => {
    test.skip(
      !parentMagicLink || !setupToken,
      "Set FAMILYAPP_E2E_PARENT_MAGIC_LINK and FAMILYAPP_E2E_SETUP_TOKEN for the authenticated smoke path.",
    );
    if (!parentMagicLink || !setupToken) {
      throw new Error(
        "FAMILYAPP_E2E_PARENT_MAGIC_LINK and FAMILYAPP_E2E_SETUP_TOKEN are required.",
      );
    }

    const childName = `Smoke Child ${Date.now()}`;
    const childPin = "2468";

    await page.goto(parentMagicLink);
    await page.goto("/setup");
    await page.getByLabel("Household name").fill("Production Smoke Household");
    await page.locator("#parentName").fill("Smoke Parent");
    await page.getByLabel("Child PIN").fill(childPin);
    await page.locator('input[name="child-0-name"]').fill(childName);
    await page.getByLabel("First-run setup token").fill(setupToken);
    await page.getByRole("button", { name: "Complete Setup" }).click();

    await expect(page.getByRole("navigation", { name: "Parent workflows" })).toBeVisible();

    await page.getByRole("link", { name: "Chores" }).click();
    await page.getByLabel("Chore").fill("Production smoke chore");
    await page.getByLabel("Points").fill("3");
    await page.getByLabel("Child").selectOption({ label: childName });
    await page.getByRole("button", { name: "Add Chore" }).click();
    await expect(page.getByText("Production smoke chore")).toBeVisible();

    await page.goto("/child");
    await page.getByLabel("Child").selectOption({ label: childName });
    await page.getByLabel("Child PIN").fill(childPin);
    await page.getByRole("button", { name: "Enter" }).click();
    await page.getByRole("button", { name: "Submit" }).first().click();
    await expect(page.getByText("Submitted Chores")).toBeVisible();

    await page.goto("/parent/approvals");
    await page.getByRole("button", { name: "Approve" }).first().click();
    await expect(page.getByText("Chore Submission approved.")).toBeVisible();

    await page.goto("/parent/points");
    await expect(page.getByText("3 Points")).toBeVisible();

    await page.goto("/parent/rewards");
    await page.getByLabel("Reward").fill("Production smoke reward");
    await page.getByLabel("Point cost").fill("3");
    await page.getByRole("button", { name: "Add Reward" }).click();
    await expect(page.getByText("Production smoke reward")).toBeVisible();

    await page.goto("/child");
    await page.getByRole("button", { name: "Request" }).first().click();
    await expect(page.getByText("Pending Review")).toBeVisible();

    await page.goto("/parent/approvals");
    await page.getByRole("button", { name: "Approve" }).first().click();
    await expect(page.getByText("Reward Request approved.")).toBeVisible();

    await page.goto("/parent/rewards");
    await page.getByRole("button", { name: "Fulfill" }).first().click();
    await expect(page.getByText("Reward Request fulfilled.")).toBeVisible();

    await page.goto("/parent/weekly-review");
    await expect(page.getByRole("heading", { name: "Weekly Review" })).toBeVisible();
    await expect(page.getByText(childName)).toBeVisible();
  });
});
