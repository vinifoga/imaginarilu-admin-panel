// components/OrderBadge.tsx
'use client';

import { OrderStatus } from "@/lib/orderStatus";
import { useState } from "react";
import { FiChevronDown } from "react-icons/fi";

type BadgeProps = {
  status: OrderStatus;
  onChange?: (newStatus: OrderStatus) => void;
};

export function OrderBadge({ status, onChange }: BadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const statusColors: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: "bg-yellow-500 text-white",
    [OrderStatus.PROCESSING]: "bg-blue-500 text-white",
    [OrderStatus.AWAITING_PAYMENT]: "bg-orange-500 text-white",
    [OrderStatus.PAID]: "bg-green-500 text-white",
    [OrderStatus.PACKED]: "bg-indigo-500 text-white",
    [OrderStatus.DELIVERED]: "bg-teal-500 text-white",
    [OrderStatus.CANCELED]: "bg-red-500 text-white",
    [OrderStatus.RETURNED]: "bg-gray-500 text-white",
    [OrderStatus.REFUNDED]: "bg-purple-500 text-white",
    [OrderStatus.AWAITING_PICKUP]: "bg-pink-500 text-white",
  };

  const handleStatusChange = (newStatus: OrderStatus) => {
    onChange?.(newStatus);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[status]} hover:opacity-90 transition-opacity`}
      >
        {status}
        <FiChevronDown className="ml-1" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            {Object.values(OrderStatus).map((statusOption) => (
              <button
                key={statusOption}
                onClick={() => handleStatusChange(statusOption)}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  status === statusOption 
                    ? 'bg-gray-100 text-gray-900' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {statusOption}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}