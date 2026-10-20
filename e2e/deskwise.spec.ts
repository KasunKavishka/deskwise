import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const usernamePrefix = `e2e_${Date.now().toString(36)}_`;
const adminUsername = `${usernamePrefix}admin`;
const employeeUsername = `${usernamePrefix}employee`;
const initialPassword = "Deskwise-E2E-Initial-Password-2026!";
const updatedPassword = "Deskwise-E2E-Updated-Password-2026!";

let supabaseAdmin: SupabaseClient;

async function listUsers(): Promise<User[]> {
  const users: User[] = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Unable to inspect the E2E Supabase project: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function findTestUser(username: string): Promise<User> {
  const user = (await listUsers()).find(
    (candidate) =>
      candidate.user_metadata.username === username ||
      candidate.app_metadata.username === username,
  );
  if (!user) throw new Error(`The E2E account "${username}" was not created.`);
  return user;
}

test.beforeAll(async () => {
  const url = process.env.E2E_SUPABASE_URL;
  const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("E2E Supabase credentials are required.");
  }

  supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const existingAdmin = (await listUsers()).find((user) => user.app_metadata.role === "admin");
  if (existingAdmin) {
    throw new Error(
      "E2E requires a dedicated Supabase project with no existing Deskwise admin. Use a disposable test project, not production.",
    );
  }
});

test.afterAll(async () => {
  if (!supabaseAdmin) return;

  const testUsers = (await listUsers()).filter((user) => {
    const username = user.user_metadata.username ?? user.app_metadata.username;
    return typeof username === "string" && username.startsWith(usernamePrefix);
  });

  for (const user of testUsers) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`Unable to clean up E2E account "${user.id}": ${error.message}`);
  }
});

test("admin setup, employee management, reservations, permissions, password changes, and sign-in", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Supabase is not configured" })).toHaveCount(0);
  await page.getByRole("button", { name: "Set up the first admin account" }).click();
  await page.getByLabel("Admin setup secret").fill(process.env.E2E_ADMIN_SETUP_SECRET!);
  await page.getByLabel("Admin name").fill("Deskwise E2E Admin");
  await page.getByLabel("Username").fill(adminUsername);
  await page.getByLabel("Password").fill(initialPassword);
  await page.getByRole("button", { name: "Create admin account" }).click();

  await expect(page.locator("main h2")).toHaveText("Dashboard");
  const adminUser = await findTestUser(adminUsername);
  const selectedDate = await page.locator('input[type="date"]').first().inputValue();
  expect(selectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  const dashboardResponse = await page.request.get(`/api/dashboard?date=${selectedDate}`);
  expect(dashboardResponse.status()).toBe(200);
  const dashboardPayload = await dashboardResponse.json();
  expect(dashboardPayload.data.summary.totalActiveDesks).toBe(4);
  expect(dashboardPayload.data.profiles.some((profile: { id: string }) => profile.id === adminUser.id)).toBe(true);

  const repeatedBootstrap = await page.request.post("/api/auth/bootstrap", {
    data: {
      setupSecret: process.env.E2E_ADMIN_SETUP_SECRET,
      username: `${usernamePrefix}duplicate`,
      fullName: "Duplicate E2E Admin",
      password: initialPassword,
    },
  });
  expect(repeatedBootstrap.status()).toBe(409);

  await page.getByRole("button", { name: "Reserve seat" }).nth(0).click();
  await expect(page.getByText("Desk reserved successfully.")).toBeVisible();

  await page.locator("aside nav button").filter({ hasText: "Employees" }).click();
  await page.getByLabel("Employee name").fill("Deskwise E2E Employee");
  await page.getByLabel("Username").fill(employeeUsername);
  await page.getByLabel("Temporary password to give employee").fill(initialPassword);
  await page.getByRole("button", { name: "Create employee account" }).click();
  await expect(page.getByText("Deskwise E2E Employee")).toBeVisible();
  const employeeUser = await findTestUser(employeeUsername);

  const adminReservationsResponse = await page.request.get(`/api/dashboard?date=${selectedDate}`);
  const adminReservationsPayload = await adminReservationsResponse.json();
  const adminReservation = adminReservationsPayload.data.reservations.find(
    (reservation: { userId: string }) => reservation.userId === adminUser.id,
  );
  expect(adminReservation).toBeDefined();

  await page.getByRole("button", { name: "Log out" }).click();
  await page.getByLabel("Username").fill(employeeUsername);
  await page.getByLabel("Password").fill(initialPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("main h2")).toHaveText("Dashboard");

  const employeeAccountCreation = await page.request.post("/api/admin/employees", {
    data: { fullName: "Unauthorized E2E", username: `${usernamePrefix}unauthorized`, password: initialPassword },
  });
  expect(employeeAccountCreation.status()).toBe(403);

  const duplicateReservation = await page.request.post("/api/reservations", {
    data: { deskId: adminReservation.deskId, bookingDate: selectedDate },
  });
  expect(duplicateReservation.status()).toBe(409);

  const forbiddenCancellation = await page.request.delete("/api/reservations", {
    data: { reservationId: adminReservation.id },
  });
  expect(forbiddenCancellation.status()).toBe(403);

  const reserveSeatButtons = page.getByRole("button", { name: "Reserve seat" });
  await reserveSeatButtons.nth(0).click();
  await expect(page.getByText("Desk reserved successfully.")).toBeVisible();
  await page.getByRole("button", { name: "Cancel my booking" }).first().click();
  await expect(page.getByText("Reservation cancelled.")).toBeVisible();
  await reserveSeatButtons.last().click();
  await expect(page.getByText("Desk reserved successfully.")).toBeVisible();

  const employeeReservationsResponse = await page.request.get(`/api/dashboard?date=${selectedDate}`);
  const employeeReservationsPayload = await employeeReservationsResponse.json();
  const employeeReservation = employeeReservationsPayload.data.reservations.find(
    (reservation: { userId: string; deskId: string }) =>
      reservation.userId === employeeUser.id && reservation.deskId === "desk-04",
  );
  expect(employeeReservation).toBeDefined();

  await page.getByRole("button", { name: "Log out" }).click();
  await page.getByLabel("Username").fill(adminUsername);
  await page.getByLabel("Password").fill(initialPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("main h2")).toHaveText("Dashboard");

  await page.locator("aside nav button").filter({ hasText: "Reservations" }).click();
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByText("Reservation cancelled.")).toBeVisible();

  await page.locator("aside nav button").filter({ hasText: "Settings" }).click();
  await expect(page.getByText("Deskwise E2E Admin")).toBeVisible();
  await page.getByLabel("Current password").fill(initialPassword);
  await page.getByLabel("New password").fill(updatedPassword);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Password updated successfully.")).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await page.getByLabel("Username").fill(adminUsername);
  await page.getByLabel("Password").fill(updatedPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("main h2")).toHaveText("Dashboard");
});
