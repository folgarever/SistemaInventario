import { Router } from 'express';
import { EntradaController } from '../controllers/entradaController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Todas las rutas de entradas requieren autenticación.
router.use(authenticateToken);

router.get('/', EntradaController.listar);
router.post('/', EntradaController.registrar);
router.get('/:id', EntradaController.obtener);

export default router;
