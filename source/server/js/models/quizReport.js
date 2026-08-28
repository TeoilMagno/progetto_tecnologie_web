const mongoose = require('mongoose');

const quizReportSchema = new mongoose.Schema({
  visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', required: true },
  guideId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // L'insegnante
  roomCode: { type: String, required: true },
  date: { type: Date, default: Date.now },
  results: [{
    studentName:{
      type: String,
      required: true
    } ,
    score: {
      type: Number,
      required: true
    },
    answers: [{
      qIndex: Number,
      selectedOption: Number,
      isCorrect: Boolean
    }]
  }]
});

module.exports = mongoose.model('QuizReport', quizReportSchema);
