// Stable shared TypeScript contracts.
export type {
  UserRole,
  UserProfile,
  StoreProfile,
  UserSummary,
  StoreSummary,
  UserWithStore,
  PublicUserProfile,
  RegisterUserInput,
  UpdateUserProfileInput,
  CreateStoreInput,
  UpdateStoreInput,
} from "./user";

export type {
  Product,
  ProductSummary,
  ProductDetail,
  Category,
  CategoryTree,
  Store,
} from "./product";

export type {
  OrderStatus,
  ShippingAddress,
  OrderItem,
  Order,
  OrderSummary,
  OrderDetail,
  CreateOrderInput,
  CreateOrderItemInput,
  OrderResult,
} from "./order";

export type {
  PaymentMethod,
  PaymentTransactionStatus,
  Payment,
  PaymentSummary,
  CreatePaymentInput,
  PaymentVerificationResult,
  PaymentWebhookEvent,
} from "./payment";

export type {
  AuthUser,
  AuthSession,
  AuthState,
  AuthStatus,
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  UpdatePasswordInput,
  AuthResult,
} from "./auth";

export type {
  AffiliateProduct,
  AffiliatePartner,
  AffiliateTracking,
  AffiliateAvailability,
  AffiliateBadgeVariant,
  LocalizedText,
} from "./affiliate";

export type { Json, Database } from "./database";
