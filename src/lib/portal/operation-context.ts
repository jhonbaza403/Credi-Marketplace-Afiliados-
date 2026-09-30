export type OperationSource = "marketplace" | "wall" | "affiliate" | "chat" | "publish" | "checkout" | "service";

export type OperationContext = {
  productId?: string | null;
  affiliateRef?: string | null;
  conversationId?: string | null;
  orderId?: string | null;
  operationId?: string | null;
  source?: OperationSource | null;
};

export function normalizeOperationContext(input: OperationContext = {}): OperationContext {
  const clean = (value: unknown, max = 256) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
  return {
    productId: clean(input.productId),
    affiliateRef: clean(input.affiliateRef, 128),
    conversationId: clean(input.conversationId),
    orderId: clean(input.orderId),
    operationId: clean(input.operationId),
    source: clean(input.source, 32) as OperationSource | null,
  };
}

export function withOperationContext(path: string, context: OperationContext): string {
  const normalized = normalizeOperationContext(context);
  const url = new URL(path, "https://credi.local");
  if (normalized.productId) url.searchParams.set("product_id", normalized.productId);
  if (normalized.affiliateRef) url.searchParams.set("ref", normalized.affiliateRef);
  if (normalized.conversationId) url.searchParams.set("conversation", normalized.conversationId);
  if (normalized.orderId) url.searchParams.set("order", normalized.orderId);
  if (normalized.operationId) url.searchParams.set("operation_id", normalized.operationId);
  if (normalized.source) url.searchParams.set("source", normalized.source);
  return `${url.pathname}${url.search}`;
}

export function operationContextFromSearchParams(params: URLSearchParams): OperationContext {
  return normalizeOperationContext({
    productId: params.get("product_id") || params.get("product"),
    affiliateRef: params.get("ref"),
    conversationId: params.get("conversation"),
    orderId: params.get("order"),
    operationId: params.get("operation_id"),
    source: params.get("source") as OperationSource | null,
  });
}
