import { TrainingModule } from '../models/index.js';
import { success, error } from '../utils/response.js';

export const getModules = async (req, res, next) => {
  try {
    const modules = await TrainingModule.find({ isActive: true });
    return success(res, modules);
  } catch (err) {
    next(err);
  }
};

export const completeModule = async (req, res, next) => {
  try {
    const moduleId = req.params.id;
    const userId = req.user._id;

    const module = await TrainingModule.findById(moduleId);
    if (!module) return error(res, 'Training module not found', 404);

    // Check if already completed
    const alreadyCompleted = module.completions.find(c => c.user.toString() === userId.toString());
    if (alreadyCompleted) {
      return success(res, module, 'Module already marked as completed');
    }

    module.completions.push({
      user: userId,
      completedAt: new Date(),
      score: req.body.score || 100
    });

    await module.save();
    return success(res, module, 'Training module completed successfully');
  } catch (err) {
    next(err);
  }
};
