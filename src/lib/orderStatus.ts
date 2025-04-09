export enum OrderStatus {
  PENDING = "Pendente",
  PROCESSING = "Em Processamento",
  AWAITING_PAYMENT = "Aguardando Pagamento",
  PAID = "Pago",
  PACKED = "Embalado",
  DELIVERED = "Entregue",
  CANCELED = "Cancelado",
  RETURNED = "Devolvido",
  REFUNDED = "Reembolsado",
  AWAITING_PICKUP = "Aguardando Retirada",
}

export const StatusFlow = [
  OrderStatus.PENDING,
  OrderStatus.PROCESSING,
  OrderStatus.AWAITING_PAYMENT,
  OrderStatus.PAID,
  OrderStatus.PACKED,
  OrderStatus.AWAITING_PICKUP,
  OrderStatus.DELIVERED,
];

export const getStatusFromTranslation = (
  translatedStatus: string
): OrderStatus => {
  return (
    (Object.entries(OrderStatus).find(
      ([, value]) => value === translatedStatus
    )?.[0] as OrderStatus) || OrderStatus.PENDING
  );
};
