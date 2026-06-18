import { authedRequest } from "./api";

// TICKETS
export async function getSupportTickets(token: string) {
  return authedRequest<any>("/support/tickets", token);
}

export async function getSupportTicketDetails(token: string, id: string) {
  return authedRequest<any>(`/support/tickets/${id}`, token);
}


export async function replyToSupportTicket(
  token: string,
  id: string,
  data: { message: string; attachmentUrls?: string[] }
) {
  return authedRequest<any>(`/support/tickets/${id}/reply`, token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// DISPUTES
export async function getCustomerDisputes(token: string) {
  return authedRequest<any>("/support/disputes", token);
}

export async function getCustomerDisputeDetails(token: string, id: string) {
  return authedRequest<any>(`/support/disputes/${id}`, token);
}

export async function openCustomerDispute(
  token: string,
  data: { repairRequestId?: string; paymentId?: string; againstId: string; reason?: string }
) {
  return authedRequest<any>("/support/disputes", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function addCustomerDisputeNote(
  token: string,
  id: string,
  data: { note: string }
) {
  return authedRequest<any>(`/support/disputes/${id}/note`, token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
