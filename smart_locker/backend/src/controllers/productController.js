const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../presenters/apiPresenter');
const {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../services/productService');

const listProductsHandler = asyncHandler(async (req, res) => {
  const products = await listProducts();
  return success(res, { products });
});

const getProductHandler = asyncHandler(async (req, res) => {
  const product = await getProductById(req.params.productId);
  return success(res, { product });
});

const createProductHandler = asyncHandler(async (req, res) => {
  const product = await createProduct(req.body);
  return success(res, { product }, 201);
});

const updateProductHandler = asyncHandler(async (req, res) => {
  const product = await updateProduct(req.params.productId, req.body);
  return success(res, { product });
});

const deleteProductHandler = asyncHandler(async (req, res) => {
  const product = await deleteProduct(req.params.productId);
  return success(res, { message: 'Product deleted', product });
});

module.exports = {
  listProductsHandler,
  getProductHandler,
  createProductHandler,
  updateProductHandler,
  deleteProductHandler
};