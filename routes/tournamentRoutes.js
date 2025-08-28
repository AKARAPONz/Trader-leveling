const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');

router.get('/', tournamentController.getTournaments);
router.post('/create', tournamentController.createTournament);
router.post('/update', tournamentController.updateTournament);
router.post('/delete/:id', tournamentController.deleteTournament);

module.exports = router;
