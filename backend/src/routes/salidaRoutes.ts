import { Router } from 'express';
import { SalidaController } from '../controllers/salidaController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Todas las rutas de salidas requieren autenticación.
router.use(authenticateToken);

router.get('/', SalidaController.listar);
router.post('/', SalidaController.registrar);
router.get('/:id', SalidaController.obtener);

export default router;
