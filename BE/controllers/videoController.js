const Video = require('../models/video');

// Listar todos os vídeos
exports.getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find();
    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Criar novo vídeo
exports.createVideo = async (req, res) => {
  const { title, url, description } = req.body;
  const video = new Video({ title, url, description });

  try {
    const newVideo = await video.save();
    res.status(201).json(newVideo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Deletar vídeo por ID
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) return res.status(404).json({ message: 'Vídeo não encontrado' });
    res.json({ message: 'Vídeo deletado' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
