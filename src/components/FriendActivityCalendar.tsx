// src/components/FriendActivityCalendar.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- Interfaces ---
interface DayObject {
  day: number | null;
  monthType: 'prev' | 'current' | 'next';
  isToday: boolean;
  fullDate: string; // YYYY-MM-DD
}

interface DailyActivity {
    completions: number;
    hasRelapse: boolean;
}

type ActivityMap = Record<string, DailyActivity>;

interface FriendActivityCalendarProps {
  friendId: number;
  friendName: string;
}

// --- Helpers ---
const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Helper para parsear fechas 'YYYY-MM-DD' como locales y evitar bugs de UTC
function parseDateAsLocal(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

// --- Componente del Calendario de Amigo ---
const FriendActivityCalendar: React.FC<FriendActivityCalendarProps> = ({ friendId, friendName }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activityData, setActivityData] = useState<ActivityMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // --- Lógica para obtener datos de la API ---
  const fetchActivityData = useCallback(async (year: number, month: number) => {
    setIsLoading(true);
    setError(null);
    try {
        const response = await fetch(`/api/friends/${friendId}/activity?year=${year}&month=${month + 1}`);
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('No tienes permiso para ver la actividad de este usuario');
          } else if (response.status === 404) {
            throw new Error('Usuario no encontrado');
          } else {
            throw new Error('No se pudo cargar la actividad');
          }
        }
        const data = await response.json();
        setActivityData(data.activity || {});
    } catch (error) {
        console.error("Error fetching friend activity data:", error);
        setError(error instanceof Error ? error.message : 'Error desconocido');
        setActivityData({}); // Limpiar datos en caso de error
    } finally {
        setIsLoading(false);
    }
  }, [friendId]);
  
  // Vuelve a cargar los datos cuando cambia el mes/año o friendId
  useEffect(() => {
    fetchActivityData(currentYear, currentMonth);
  }, [currentYear, currentMonth, fetchActivityData]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // --- Lógica para construir la grilla del calendario ---
  const calendarGrid = useMemo(() => {
    // CORRECCIÓN ZONA HORARIA: Usar componentes de fecha local
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: DayObject[] = [];

    // Función para formatear fechas consistentemente
    const getLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(currentYear, currentMonth - 1, day);
      days.push({ day, monthType: 'prev', isToday: false, fullDate: getLocalDateString(date) });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      days.push({ day: i, monthType: 'current', isToday: date.getTime() === today.getTime(), fullDate: getLocalDateString(date) });
    }

    const totalCells = days.length;
    const remainder = totalCells % 7;
    if (remainder !== 0) {
      const cellsToAdd = 7 - remainder;
      for (let i = 1; i <= cellsToAdd; i++) {
        const date = new Date(currentYear, currentMonth + 1, i);
        days.push({ day: i, monthType: 'next', isToday: false, fullDate: getLocalDateString(date) });
      }
    }
    
    const weeks: DayObject[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return weeks;
  }, [currentMonth, currentYear]);

  // --- Función para obtener el estilo del día (Heatmap) ---
  const getDayStyle = (day: DayObject): string => {
    if (day.monthType !== 'current') return 'other-month';

    const activity = activityData[day.fullDate];
    if (!activity) return 'current-month';

    if (activity.hasRelapse) {
        return 'relapse-day'; // Estilo para recaídas
    }

    const completions = activity.completions;
    if (completions >= 5) return 'heatmap-4'; // Verde más intenso
    if (completions >= 3) return 'heatmap-3';
    if (completions >= 1) return 'heatmap-2';
    
    return 'current-month'; // Si hay un registro pero 0 completados
  };

  if (error) {
    return (
      <div className="ery-calendar-container">
        <div className="text-center py-8">
          <div className="text-red-400 mb-2">⚠️ Error</div>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        /* --- ESTILOS MEJORADOS --- */
        .ery-calendar-container {
            --primary-color: #4338ca;
            --secondary-color: #374151;
            --tertiary-color: #9ca3af;
            width: 100%;
            padding: 1rem;
            background-color: #1f2937;
            border-radius: 0.75rem;
            color: white;
            position: relative; /* Para el overlay de carga */
        }
        .loading-overlay {
            position: absolute;
            inset: 0;
            background-color: rgba(31, 41, 55, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10;
            border-radius: 0.75rem;
            transition: opacity 0.3s;
        }
        .ery-calendar-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        .ery-calendar-controls h2 { font-size: 1.25rem; font-weight: 600; }
        .ery-calendar-controls button {
            background: none; border: none; color: var(--tertiary-color);
            cursor: pointer; padding: 0.5rem; border-radius: 9999px; transition: background-color 0.2s;
        }
        .ery-calendar-controls button:hover { background-color: var(--secondary-color); }
        .ery-calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; }
        .ery-calendar-weekday { text-align: center; font-size: 0.875rem; font-weight: 500; color: var(--tertiary-color); }
        .ery-calendar-day {
            display: flex; justify-content: center; align-items: center;
            height: 2.5rem; border-radius: 9999px; font-size: 0.875rem;
            cursor: pointer; transition: background-color 0.2s, transform 0.1s, box-shadow 0.2s;
            position: relative; /* Para el punto de recaída */
        }
        .ery-calendar-day.current-month { color: #d1d5db; }
        .ery-calendar-day.other-month { color: #4b5563; pointer-events: none; }
        .ery-calendar-day.today { box-shadow: 0 0 0 2px var(--primary-color); font-weight: 700; }
        .ery-calendar-day:not(.today):not(.other-month):hover { background-color: var(--secondary-color); transform: scale(1.1); }
        
        /* --- ESTILOS DEL HEATMAP --- */
        .ery-calendar-day.heatmap-2 { background-color: rgba(34, 197, 94, 0.3); } /* Verde claro */
        .ery-calendar-day.heatmap-3 { background-color: rgba(34, 197, 94, 0.6); }
        .ery-calendar-day.heatmap-4 { background-color: rgba(34, 197, 94, 0.9); } /* Verde oscuro */
        
        .ery-calendar-day.relapse-day::after {
            content: '';
            position: absolute;
            bottom: 6px;
            left: 50%;
            transform: translateX(-50%);
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background-color: #ef4444; /* Rojo */
        }
      `}</style>

      <div className="ery-calendar-container">
        {isLoading && (
            <div className="loading-overlay">
                <p>Cargando actividad de {friendName}...</p>
            </div>
        )}
        <section className="ery-calendar-controls">
          <button onClick={handlePrevMonth} aria-label="Mes anterior">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <h2>{new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(currentDate)}</h2>
          <button onClick={handleNextMonth} aria-label="Mes siguiente">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
        </section>

        <section>
          <div className="ery-calendar-grid mb-2">
            {DAYS_OF_WEEK.map(day => ( <div key={day} className="ery-calendar-weekday">{day}</div> ))}
          </div>
          <div className="space-y-2">
            {calendarGrid.map((week, weekIndex) => (
              <div key={weekIndex} className="ery-calendar-grid">
                {week.map((dayObj, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`ery-calendar-day 
                      ${getDayStyle(dayObj)}
                      ${dayObj.isToday ? 'today' : ''}
                    `}
                  >
                    {dayObj.day}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
};

export default FriendActivityCalendar;