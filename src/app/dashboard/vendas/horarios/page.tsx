// app/dashboard/vendas/horarios/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseCliente';
import { format } from 'date-fns';

export default function DeliverySchedulePage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const generateAllTimeSlots = () => {
        const slots = [];
        for (let hour = 7; hour < 19; hour++) {
            slots.push(`${hour.toString().padStart(2, '0')}:00 às ${(hour + 1).toString().padStart(2, '0')}:00`);
        }
        return slots;
    };

    const fetchBookedSlots = async (selectedDate: Date) => {
        setIsLoading(true);
        try {
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');

            const { data: deliveries, error } = await supabase
                .from('delivery_infos')
                .select('delivery_time')
                .eq('delivery_date', formattedDate);

            if (error) throw error;

            const slotCounts: Record<string, number> = {};
            const allSlots = generateAllTimeSlots();

            allSlots.forEach(slot => {
                slotCounts[slot] = 0;
            });

            deliveries?.forEach(delivery => {
                if (delivery.delivery_time) {
                    const hour = parseInt(delivery.delivery_time.split(':')[0]);
                    if (hour >= 7 && hour < 19) {
                        const slot = `${hour.toString().padStart(2, '0')}:00 às ${(hour + 1).toString().padStart(2, '0')}:00`;
                        slotCounts[slot] = (slotCounts[slot] || 0) + 1;
                    }
                }
            });

            setAvailableSlots(allSlots.filter(slot => slotCounts[slot] < 2));
        } catch (error) {
            console.error('Error fetching delivery slots:', error);
            setAvailableSlots([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (date) {
            fetchBookedSlots(date);
        }
    }, [date]);

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">Horários de Entrega Disponíveis</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Seletor de data */}
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">Selecione uma data</h2>
                        <input
                            type="date"
                            value={date ? format(date, 'yyyy-MM-dd') : ''}
                            onChange={(e) => setDate(e.target.value ? new Date(e.target.value) : undefined)}
                            min={format(new Date(), 'yyyy-MM-dd')}
                            className="w-full p-2 border rounded"
                        />
                        {date && (
                            <p className="mt-4 text-sm text-gray-600">
                                Visualizando horários para: {date.toLocaleDateString('pt-BR')}
                            </p>
                        )}
                    </div>

                    {/* Lista de horários */}
                    <div className="bg-white p-4 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">Horários Disponíveis</h2>

                        {isLoading ? (
                            <div className="flex justify-center items-center h-40">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                            </div>
                        ) : availableSlots.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {availableSlots.map((slot) => (
                                    <div
                                        key={slot}
                                        className="p-3 bg-green-100 text-green-800 rounded border border-green-200"
                                    >
                                        {slot}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-500">
                                    {date ? 'Nenhum horário disponível para esta data' : 'Selecione uma data para ver os horários'}
                                </p>
                            </div>
                        )}

                        <div className="mt-6 text-sm text-gray-500">
                            <p><span className="font-medium">Legenda:</span></p>
                            <div className="flex items-center mt-2">
                                <div className="w-4 h-4 bg-green-100 border border-green-200 mr-2"></div>
                                <span>Horário disponível (menos de 2 entregas)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}