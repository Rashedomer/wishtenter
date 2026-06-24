const express = require('express');
const router = express.Router();
const { createGoal, getMyGoals, deleteGoal, updateGoal, getAllGoals } = require('../controllers/goalController');
const auth = require('../middleware/auth');

router.get('/', getAllGoals); // Public/Supporter feed
router.post('/', auth, createGoal);
router.get('/my', auth, getMyGoals);
router.put('/:id', auth, updateGoal);
router.delete('/:id', auth, deleteGoal);

module.exports = router;
