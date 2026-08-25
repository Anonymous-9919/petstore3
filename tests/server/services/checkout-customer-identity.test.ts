import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/services/fulfillment", () => ({ isValidFulfillmentSlot: vi.fn() }));
vi.mock("@/server/notifications/email", () => ({ notifyOrderCreated: vi.fn() }));

import { resolveCheckoutCustomer } from "@/server/services/checkout";

const client = { customer: { findFirst: mocks.findFirst, findMany: mocks.findMany, update: mocks.update, create: mocks.create } };
const contact = { name: "Checkout Name", phone: "+96551234567", email: "checkout@example.com" };

describe("checkout customer identity", () => {
  beforeEach(() => {
    mocks.findFirst.mockReset();
    mocks.findMany.mockReset();
    mocks.update.mockReset();
    mocks.create.mockReset();
  });

  it("does not attach or overwrite a registered profile during guest checkout", async () => {
    mocks.findMany.mockResolvedValue([{ id: "registered-customer", email: "profile@example.com", userId: "user-id" }]);

    await expect(resolveCheckoutCustomer(client as never, contact)).resolves.toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("uses an authenticated customer without replacing profile fields", async () => {
    const registered = { id: "registered-customer", email: "profile@example.com", userId: "user-id" };
    mocks.findFirst.mockResolvedValue(registered);

    await expect(resolveCheckoutCustomer(client as never, contact, registered.id)).resolves.toEqual(registered);
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: registered.id, userId: { not: null } } }));
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("may update an unlinked guest profile while retaining its identity", async () => {
    mocks.findMany.mockResolvedValue([{ id: "guest-customer", email: null, userId: null }]);
    mocks.update.mockResolvedValue({ id: "guest-customer", email: contact.email, userId: null });

    await resolveCheckoutCustomer(client as never, contact);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "guest-customer" },
      data: { name: contact.name, email: contact.email },
    }));
  });

  it("leaves ambiguous legacy phone matches unlinked", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "guest-customer", email: null, userId: null },
      { id: "registered-customer", email: "profile@example.com", userId: "user-id" },
    ]);

    await expect(resolveCheckoutCustomer(client as never, contact)).resolves.toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
