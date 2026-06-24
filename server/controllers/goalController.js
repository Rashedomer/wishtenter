const prisma = require('../prisma/client');
const { normalizeGoal, normalizeUploadUrl, assertModeratedImageUrl } = require('../utils/mediaUrl');
const { assertTextSafe } = require('../utils/contentModeration');

const createGoal = async (req, res) => {
  const { title, description, targetAmount, imageUrl } = req.body;
  console.log('CREATE GOAL REQ BODY:', req.body);

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.userId },
    });

    if (!profile) {
      return res.status(404).json({ message: 'Creator profile not found' });
    }

    const textCheck = assertTextSafe([
      { value: title, label: 'wish title' },
      { value: description, label: 'wish description' },
    ]);
    if (!textCheck.safe) {
      return res.status(400).json({ message: textCheck.message });
    }

    const imageCheck = assertModeratedImageUrl(imageUrl, 'wish image');
    if (!imageCheck.safe) {
      return res.status(400).json({ message: imageCheck.message });
    }

    const parsedAmount = parseFloat(targetAmount);
    if (isNaN(parsedAmount) || parsedAmount < 5 || parsedAmount > 1000) {
      return res.status(400).json({ message: 'Wish amount must be between $5 and $1000.' });
    }

    const goal = await prisma.goal.create({
      data: {
        title,
        description,
        targetAmount: parsedAmount,
        imageUrl: normalizeUploadUrl(imageUrl),
        creatorId: profile.id,
      },
    });

    res.status(201).json(normalizeGoal(goal));
  } catch (err) {
    console.error('ERROR CREATING GOAL:', err);
    res.status(500).json({ 
      message: 'Error creating wish', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
  }
};

const getMyGoals = async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.userId },
    });

    if (!profile) {
      return res.status(404).json({ message: 'Creator profile not found' });
    }

    const hasPagination = ('page' in req.query) || ('limit' in req.query);
    if (!hasPagination) {
      // Backwards-compatible: return full array when no pagination params provided
      const goals = await prisma.goal.findMany({
        where: { creatorId: profile.id },
        orderBy: { createdAt: 'desc' },
      });
      return res.json(goals.map(normalizeGoal));
    }

    // Add pagination support
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const goals = await prisma.goal.findMany({
      where: { creatorId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: skip,
    });

    const total = await prisma.goal.count({
      where: { creatorId: profile.id }
    });

    res.json({
      data: goals.map(normalizeGoal),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching goals' });
  }
};

const deleteGoal = async (req, res) => {
  const { id } = req.params;

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.userId },
    });

    const goal = await prisma.goal.findUnique({ where: { id } });

    if (!goal || goal.creatorId !== profile.id) {
      return res.status(403).json({ message: 'Not authorized to delete this goal' });
    }

    await prisma.goal.delete({ where: { id } });
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting goal' });
  }
};

const updateGoal = async (req, res) => {
  const { id } = req.params;
  const { title, description, targetAmount, imageUrl } = req.body;
  console.log('UPDATE GOAL REQ BODY:', req.body);

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.userId },
    });

    const goal = await prisma.goal.findUnique({ where: { id } });

    if (!goal || goal.creatorId !== profile.id) {
      return res.status(403).json({ message: 'Not authorized to update this goal' });
    }

    const textCheck = assertTextSafe([
      { value: title, label: 'wish title' },
      { value: description, label: 'wish description' },
    ]);
    if (!textCheck.safe) {
      return res.status(400).json({ message: textCheck.message });
    }

    const imageCheck = assertModeratedImageUrl(imageUrl, 'wish image');
    if (!imageCheck.safe) {
      return res.status(400).json({ message: imageCheck.message });
    }

    const parsedAmount = parseFloat(targetAmount);
    if (isNaN(parsedAmount) || parsedAmount < 5 || parsedAmount > 1000) {
      return res.status(400).json({ message: 'Wish amount must be between $5 and $1000.' });
    }

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        title,
        description,
        targetAmount: parsedAmount,
        imageUrl: normalizeUploadUrl(imageUrl),
      },
    });

    res.json(normalizeGoal(updatedGoal));
  } catch (err) {
    console.error('ERROR UPDATING GOAL:', err);
    res.status(500).json({ 
      message: 'Error updating wish', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
  }
};

const getAllGoals = async (req, res) => {
  try {
    // Detect if client requested pagination/search
    const hasPagination = ('page' in req.query) || ('limit' in req.query) || ('search' in req.query);

    if (!hasPagination) {
      // Backwards-compatible: return full array when no pagination params provided
      const goals = await prisma.goal.findMany({
        where: { status: 'active' },
        include: {
          profile: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, coverUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return res.json(goals.map(normalizeGoal));
    }

    // Pagination defaults
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12); // Max 50, default 12
    const skip = (page - 1) * limit;

    // Build optional search filter
    const search = req.query.search || '';
    const searchFilter = search ? { title: { contains: search, mode: 'insensitive' } } : {};

    // Get paginated goals
    const goals = await prisma.goal.findMany({
      where: { status: 'active', ...searchFilter },
      include: {
        profile: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, coverUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: skip,
    });

    // Get total count for pagination
    const total = await prisma.goal.count({
      where: { status: 'active', ...searchFilter }
    });

    res.json({
      data: goals.map(normalizeGoal),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching goals' });
  }
};

module.exports = { createGoal, getMyGoals, deleteGoal, updateGoal, getAllGoals };
