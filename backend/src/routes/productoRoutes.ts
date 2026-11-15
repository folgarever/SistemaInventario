import { Router } from 'express';
import { ProductoController } from '../controllers/productoController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Todas las rutas de productos requieren autenticación.
router.use(authenticateToken);

router.get('/', ProductoController.listar);
router.post('/', ProductoController.crear);
router.get('/:id', ProductoController.obtener);
router.put('/:id', ProductoController.actualizar);
router.patch('/:id/estado', ProductoController.cambiarEstado);
router.delete('/:id', ProductoController.eliminar);

export default router;
