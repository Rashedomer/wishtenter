const prisma = require('../prisma/client');

const toggleFavorite = async (req, res) => {
  const { creatorId } = req.body;
  const userId = req.user.userId;

  try {
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_creatorId: { userId, creatorId }
      }
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { id: existing.id }
      });
      return res.json({ favorited: false });
    } else {
      await prisma.favorite.create({
        data: { userId, creatorId }
      });
      return res.json({ favorited: true });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error toggling favorite' });
  }
};

const getMyFavorites = async (req, res) => {
  const userId = req.user.userId;
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      select: { creatorId: true }
    });
    res.json(favorites.map(f => f.creatorId));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching favorites' });
  }
};

module.exports = { toggleFavorite, getMyFavorites };
