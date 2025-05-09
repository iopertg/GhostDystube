const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');

// GET /api/videos - listar todos os vídeos
router.get('/', videoController.getAllVideos);

// POST /api/videos - criar novo vídeo
router.post('/', videoController.createVideo);

// DELETE /api/videos/:id - deletar vídeo por ID
router.delete('/:id', videoController.deleteVideo);

module.exports = router;
