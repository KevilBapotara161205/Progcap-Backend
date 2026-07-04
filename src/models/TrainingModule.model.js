import mongoose from 'mongoose';

const trainingModuleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    contentType: {
      type: String,
      enum: ['VIDEO', 'PDF', 'QUIZ'],
    },
    contentUrl: { type: String },
    quizQuestions: [
      {
        question: { type: String },
        options: [{ type: String }],
        correctIndex: { type: Number },
      },
    ],
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    completions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        completedAt: { type: Date },
        score: { type: Number },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('TrainingModule', trainingModuleSchema);
