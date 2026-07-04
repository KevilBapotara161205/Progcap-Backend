import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate.js';
import { protect, restrictTo } from '../middlewares/auth.js';
import * as orgController from '../controllers/org.controller.js';

const router = express.Router();

router.use(protect);

// Regions
router.get('/regions', restrictTo('SUPER_ADMIN', 'RBH'), orgController.getRegions);
router.post('/regions', restrictTo('SUPER_ADMIN'), [body('name').notEmpty()], validate, orgController.createRegion);
router.patch('/regions/:id', restrictTo('SUPER_ADMIN'), orgController.updateRegion);

// Clusters
router.get('/clusters', restrictTo('SUPER_ADMIN', 'RBH', 'CLUSTER_MANAGER'), orgController.getClusters);
router.post('/clusters', restrictTo('SUPER_ADMIN', 'RBH'), [body('name').notEmpty(), body('region').notEmpty()], validate, orgController.createCluster);
router.patch('/clusters/:id', restrictTo('SUPER_ADMIN', 'RBH'), orgController.updateCluster);

// Territories
router.get('/territories', orgController.getTerritories);
router.post('/territories', restrictTo('SUPER_ADMIN', 'RBH', 'CLUSTER_MANAGER'), [body('name').notEmpty(), body('cluster').notEmpty()], validate, orgController.createTerritory);
router.patch('/territories/:id', restrictTo('SUPER_ADMIN', 'RBH', 'CLUSTER_MANAGER'), orgController.updateTerritory);

// Hierarchy
router.get('/hierarchy', restrictTo('SUPER_ADMIN', 'RBH'), orgController.getHierarchy);

export default router;
