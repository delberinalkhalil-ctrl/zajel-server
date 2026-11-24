import { Handler } from './runtime';
import { initUser, updateProfile, registerToken, deleteAccount } from './users';
import { sendPigeon, catchPigeon, releasePigeon } from './pigeons';
import { sendMessage, markRead, markDelivered } from './chats';
import { startCall, answerCall, endCall } from './calls';
import { verifyPurchase } from './billing';
import { landPigeon } from './jobs';
import { blockUser, unblockUser, reportUser } from './safety';

/** Every call the app can make, by name. */
export const handlers: Record<string, Handler> = {
  initUser, updateProfile, registerToken, deleteAccount,
  sendPigeon, catchPigeon, releasePigeon, landPigeon,
  sendMessage, markRead, markDelivered,
  startCall, answerCall, endCall,
  verifyPurchase,
  blockUser, unblockUser, reportUser,
};
export { pigeonClock, vipExpiry } from './jobs';
