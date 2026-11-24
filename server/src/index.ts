import { Handler } from './runtime';
import { initUser, updateProfile, registerToken, deleteAccount, ackNotice } from './users';
import { sendPigeon, catchPigeon, releasePigeon, myStats } from './pigeons';
import { sendMessage, markRead, markDelivered, deleteMessage, setChatTtl } from './chats';
import { startCall, answerCall, endCall } from './calls';
import { verifyPurchase } from './billing';
import { landPigeon } from './jobs';
import { blockUser, unblockUser, reportUser } from './safety';
import { logError } from './errors';
import { countryFact } from './facts';
import {
  adminMe, adminStats, adminReports, adminUser, adminChat, adminAction, adminLog, adminErrors, adminSetRole, adminRoles, adminAnnounce,
} from './admin';

/** Every call the app can make, by name. */
export const handlers: Record<string, Handler> = {
  initUser, updateProfile, registerToken, deleteAccount, ackNotice,
  sendPigeon, catchPigeon, releasePigeon, landPigeon, myStats,
  sendMessage, markRead, markDelivered, deleteMessage, setChatTtl,
  startCall, answerCall, endCall,
  verifyPurchase,
  blockUser, unblockUser, reportUser,
  logError, countryFact,
  adminMe, adminStats, adminReports, adminUser, adminChat, adminAction, adminLog, adminErrors, adminSetRole, adminRoles, adminAnnounce,
};
export { pigeonClock, vipExpiry } from './jobs';
