import { Router } from 'express';
import { CategoriaController } from '../controllers/categoriaController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Todas las rutas de categorías requieren autenticación.
router.use(authenticateToken);

router.get('/', CategoriaController.listar);
router.post('/', CategoriaController.crear);
router.get('/:id', CategoriaController.obtener);
router.put('/:id', CategoriaController.actualizar);
router.patch('/:id/estado', CategoriaController.cambiarEstado);
router.delete('/:id', CategoriaController.eliminar);

export default router;
