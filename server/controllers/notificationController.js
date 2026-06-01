import Notification from '../models/Notification.js';

export const getNotifications = async (req, res) => {
  const notifications = await Notification.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(50);
  res.status(200).json({ success: true, data: notifications });
};

export const updateNotifications = async (req, res) => {
  const { ids = [], isRead = true } = req.body;
  const query = { userId: req.user.userId };

  if (Array.isArray(ids) && ids.length > 0) {
    query._id = { $in: ids };
  }

  await Notification.updateMany(query, { $set: { isRead: Boolean(isRead) } });
  const notifications = await Notification.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(50);

  res.status(200).json({ success: true, data: notifications });
};
