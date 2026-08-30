// ==========================================================
// ARCHIVO: src/lib/database/index.ts
// Credi Marketplace
//
// Database Layer Exports
//
// Punto único de acceso
//
// Next.js App Router
// TypeScript
// ==========================================================


// Server Client

export {
  getDatabaseServerClient,
} from "./server";



// Queries

export {
  getProducts,
  getProductById,
  getProductBySlug,
  getUserProfile,
  getUserOrders,
  getAffiliateByUser,
  getInventoryByProduct,
} from "./queries";
