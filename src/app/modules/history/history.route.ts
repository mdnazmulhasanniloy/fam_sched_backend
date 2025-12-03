
import { Router } from 'express';
import { historyController } from './history.controller';

const router = Router();

router.post('/', historyController.createHistory);
router.patch('/:id', historyController.updateHistory);
router.delete('/:id', historyController.deleteHistory);
router.get('/:id', historyController.getHistoryById);
router.get('/', historyController.getAllHistory);

export const historyRoutes = router;