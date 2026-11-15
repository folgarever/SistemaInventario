import { Router } from 'express';
import { ProveedorController } from '../controllers/proveedorController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Todas las rutas de proveedores requieren autenticación.
router.use(authenticateToken);

router.get('/', ProveedorController.listar);
router.post('/', ProveedorController.crear);
router.get('/:id', ProveedorController.obtener);
router.put('/:id', ProveedorController.actualizar);
router.patch('/:id/estado', ProveedorController.cambiarEstado);
router.delete('/:id', ProveedorController.eliminar);

export default router;
