const express = require('express');
const { requireAuth, allowRoles } = require('../middleware/authMiddleware');
const { Roles } = require('../constants/enums');
const {
  listProductsHandler,
  getProductHandler,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler
} = require('../controllers/productController');

const router = express.Router();

router.use(requireAuth);
router.get('/', listProductsHandler);
router.get('/:productId', getProductHandler);
router.post('/', allowRoles([Roles.SUPER_ADMIN]), createProductHandler);
router.patch('/:productId', allowRoles([Roles.SUPER_ADMIN]), updateProductHandler);
router.delete('/:productId', allowRoles([Roles.SUPER_ADMIN]), deleteProductHandler);

module.exports = router;