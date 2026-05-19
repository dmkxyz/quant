import { expect, test } from "@playwright/test";

test("mobile test-auth flow solves a drill and reaches lessons/progress", async ({ page }, testInfo) => {
  await page.goto("./?testAuth=1");
  await page.getByRole("button", { name: "Test auth" }).click();

  await expect(page.getByRole("heading", { name: "Quant" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Conditional Dice Update" })).toBeVisible();
  await page.screenshot({ path: `test-results/screenshots/${testInfo.project.name}-today.png`, fullPage: false });

  await page.getByPlaceholder("Write the next reasoning step...").fill("I anchor on equally likely dice states before conditioning.");
  await page.getByRole("button", { name: "Submit stage" }).click();
  await page.getByRole("button", { name: "Hint 0/3" }).click();
  await expect(page.getByText("Rewrite the sample space after the signal.")).toBeVisible();

  await page
    .getByPlaceholder("Summarize your fair value, update, quote, confidence, and one possible mistake...")
    .fill(
      "I start with the symmetric sample space, update after the signal removes states, and quote a moderately wide market until I verify the arithmetic."
    );
  await page.getByRole("button", { name: "4" }).click();
  await page.getByRole("button", { name: "Submit final answer" }).click();
  await expect(page.getByText("score")).toBeVisible();

  await page.getByRole("button", { name: "Lessons" }).click();
  await expect(page.getByRole("heading", { name: "Revisit weak concepts" })).toBeVisible();
  await expect(page.getByText("Revisit Conditional Dice Update")).toBeVisible();

  await page.getByRole("button", { name: "Progress" }).click();
  await expect(page.getByRole("heading", { name: "Signal dashboard" })).toBeVisible();
  await expect(page.getByText("Completion", { exact: true })).toBeVisible();
});
