import Pusher from "pusher";
import { env } from "../config/env.js";

const isPusherConfigured = Boolean(
  env.pusherAppId && env.pusherKey && env.pusherSecret && env.pusherCluster,
);

const pusher = isPusherConfigured
  ? new Pusher({
      appId: env.pusherAppId,
      key: env.pusherKey,
      secret: env.pusherSecret,
      cluster: env.pusherCluster,
      useTLS: true,
    })
  : null;

export function getPusherPublicConfig() {
  return {
    enabled: isPusherConfigured,
    key: env.pusherKey,
    cluster: env.pusherCluster,
  };
}

export async function publishDeliveryChatMessage(deliveryId: string, payload: unknown) {
  if (!pusher) return;
  await pusher.trigger(`private-delivery-chat-${deliveryId}`, "message:new", payload);
}
