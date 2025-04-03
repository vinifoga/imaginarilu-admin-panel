import { OrderStatus } from "@/lib/orderStatus";

type BadgeProps = {
  status: OrderStatus;
};

export function OrderBadge({ status }: BadgeProps) {
  const statusColors: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: "bg-yellow-500 text-white",
    [OrderStatus.PROCESSING]: "bg-blue-500 text-white",
    [OrderStatus.AWAITING_PAYMENT]: "bg-orange-500 text-white",
    [OrderStatus.PAID]: "bg-green-500 text-white",
    [OrderStatus.SHIPPED]: "bg-indigo-500 text-white",
    [OrderStatus.DELIVERED]: "bg-teal-500 text-white",
    [OrderStatus.CANCELED]: "bg-red-500 text-white",
    [OrderStatus.RETURNED]: "bg-gray-500 text-white",
    [OrderStatus.REFUNDED]: "bg-purple-500 text-white",
    [OrderStatus.AWAITING_PICKUP]: "bg-pink-500 text-white",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status]}`}>
      {status}
    </span>
  );
}
