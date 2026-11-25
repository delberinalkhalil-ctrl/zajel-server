import { Handler } from './runtime';
import { initUser, updateProfile, registerToken, deleteAccount, ackNotice } from './users';
import { sendPigeon, catchPigeon, releasePigeon, myStats } from './pigeons';
import { sendMessage, markRead, markDelivered, deleteMessage, setChatTtl, deleteChat } from './chats';
import { startCall, answerCall, endCall } from './calls';
import { verifyPurchase } from './billing';
import { landPigeon } from './jobs';
import { blockUser, unblockUser, reportUser } from './safety';
import { logError } from './errors';
import { supportSend, supportRead, adminSupportList, adminSupportThread, adminSupportReply } from './support';
import { countryFact } from './facts';
import {
  adminMe, adminStats, adminReports, adminUser, adminChat, adminAction, adminLog, adminErrors, adminSetRole, adminRoles, adminAnnounce,
  adminGrant, adminFind,
} from './admin';

/** Every call the app can make, by name. */
export const handlers: Record<string, Handler> = {
  initUser, updateProfile, registerToken, deleteAccount, ackNotice,
  sendPigeon, catchPigeon, releasePigeon, landPigeon, myStats,
  sendMessage, markRead, markDelivered, deleteMessage, setChatTtl, deleteChat,
  startCall, answerCall, endCall,
  verifyPurchase,
  blockUser, unblockUser, reportUser,
  logError, countryFact,
  adminMe, adminStats, adminReports, adminUser, adminChat, adminAction, adminLog, adminErrors, adminSetRole, adminRoles, adminAnnounce,
  adminGrant, adminFind,
  supportSend, supportRead, adminSupportList, adminSupportThread, adminSupportReply,
};
export { pigeonClock, vipExpiry } from './jobs';
