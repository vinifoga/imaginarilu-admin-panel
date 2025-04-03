// app/dashboard/vendas/[id]/page.tsx

import SaleDetails from "../../../../../../components/SaleDetails";

export default function SaleDetailsPage() {
    return <SaleDetails backRoute="/dashboard/consulta-vendas" />;
}