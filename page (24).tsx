function formatPrice(
  price: number,
  currency: string
): string {
  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }
    ).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}
