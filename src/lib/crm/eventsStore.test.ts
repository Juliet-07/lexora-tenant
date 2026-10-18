import { beforeEach, describe, expect, it, vi } from "vitest";

describe("event management prototype lifecycle", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  const createPublished = async (capacity = 2) => {
    const store = await import("./eventsStore");
    const event = store.createEvent({
      title: "Board briefing", type: "Workshop", status: "Published",
      description: "", date: "2099-11-01", startTime: "09:00", endTime: "10:00",
      location: "Kigali", virtual: false, meetingLink: "", capacity,
      host: "Lexora", agenda: "", registrationDeadline: "2099-10-31",
    });
    return { store, event };
  };

  const attendee = { name: "Test Attendee", email: "attendee@example.com", organisation: "Example", phone: "", notes: "" };

  it("creates an invite, registers its contact, checks in and cancels with consistent tracking", async () => {
    const { store, event } = await createPublished();
    store.sendEventInvites(event.id, [{ id: "contact-1", ...attendee }]);
    const invited = store.findEventByInviteToken(event.id)?.event.invites[0];
    expect(invited?.contactId).toBe("contact-1");
    const found = store.findEventByInviteToken(invited?.token ?? "");
    expect(found?.event.id).toBe(event.id);
    expect(store.registerForEvent(event.id, attendee).ok).toBe(true);
    const registered = store.findEventByInviteToken(event.id)?.event;
    expect(registered?.invites[0].status).toBe("Registered");
    const registrationId = registered?.registrations[0].id ?? "";
    store.setRegistrationStatus(event.id, registrationId, "Attended");
    expect(store.findEventByInviteToken(event.id)?.event.invites[0].status).toBe("Attended");
    expect(store.findEventByInviteToken(event.id)?.event.registrations[0].checkedInAt).toBeTruthy();
    store.setRegistrationStatus(event.id, registrationId, "Cancelled");
    const cancelled = store.findEventByInviteToken(event.id)?.event;
    expect(cancelled?.invites[0].status).toBe("Declined");
    expect(cancelled?.registrations[0].checkedInAt).toBeNull();
    expect(cancelled ? store.activeRegistrations(cancelled).length : -1).toBe(0);
    expect(JSON.parse(localStorage.getItem("lexora.crm.events.v1") ?? "{}").events[0].id).toBe(event.id);
  });

  it("enforces capacity while cancelled registrations release their places", async () => {
    const { store, event } = await createPublished(1);
    expect(store.registerForEvent(event.id, attendee).ok).toBe(true);
    expect(store.registerForEvent(event.id, { ...attendee, email: "second@example.com" }).reason).toBe("This event has reached full capacity.");
    const reg = store.findEventByInviteToken(event.id)?.event.registrations[0];
    store.setRegistrationStatus(event.id, reg?.id ?? "", "Cancelled");
    expect(store.registerForEvent(event.id, { ...attendee, email: "second@example.com" }).ok).toBe(true);
  });

  it("rejects duplicate and invalid registrations", async () => {
    const { store, event } = await createPublished();
    expect(store.registerForEvent(event.id, { ...attendee, email: "invalid" }).ok).toBe(false);
    expect(store.registerForEvent(event.id, attendee).ok).toBe(true);
    expect(store.registerForEvent(event.id, { ...attendee, email: "ATTENDEE@example.com" }).reason).toBe("This email address is already registered.");
  });

  it("closes registration for drafts and passed deadlines", async () => {
    const { store, event } = await createPublished();
    const { id, invites, registrations, createdAt, ...payload } = event;
    store.updateEventDetails(id, { ...payload, status: "Draft" });
    expect(store.registerForEvent(id, attendee).ok).toBe(false);
    store.updateEventDetails(id, { ...payload, registrationDeadline: "2000-01-01" });
    expect(store.registerForEvent(id, attendee).reason).toBe("The registration deadline has passed.");
    store.deleteEvent(id);
    expect(store.findEventByInviteToken(id)).toBeNull();
  });
});