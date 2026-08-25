import "server-only";

import { Resend } from "resend";

type OrderEmail = {
  email: string | null | undefined;
  orderNumber: string;
  status: string;
  total: { toString(): string };
  currencyCode: string;
};

function apiKey() {
  return process.env.RESEND_API_KEY?.trim() || process.env.EMAIL_PROVIDER_API_KEY?.trim();
}

export function isResendConfigured() {
  return Boolean(apiKey());
}

export async function sendEmail(input: { to: string; subject: string; html: string }) {
  const key = apiKey();
  if (!key) throw new Error("Resend is not configured.");
  const resend = new Resend(key);
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev",
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function statusLabel(status: string) {
  return status.toLowerCase().split("_").map((word) => `${word[0]?.toUpperCase()}${word.slice(1)}`).join(" ");
}

function sendOrderEmail(order: OrderEmail, subject: string, heading: string) {
  if (!order.email || !isResendConfigured()) return;

  const orderNumber = escapeHtml(order.orderNumber);
  const status = escapeHtml(statusLabel(order.status));
  const total = escapeHtml(order.total.toString());
  const currency = escapeHtml(order.currencyCode);

  // Email failures must not affect completed order transactions or API responses.
  void sendEmail({
    to: order.email,
    subject: `${subject} ${order.orderNumber}`,
    html: `<h1>${heading}</h1><p>Order <strong>${orderNumber}</strong></p><p>Status: <strong>${status}</strong></p><p>Total: <strong>${total} ${currency}</strong></p>`,
  }).catch(() => undefined);
}

export function notifyOrderCreated(order: OrderEmail) {
  sendOrderEmail(order, "Order received:", "Thank you for your order");
}

export function notifyOrderStatusChanged(order: OrderEmail) {
  sendOrderEmail(order, "Order update:", "Your order status has changed");
}
