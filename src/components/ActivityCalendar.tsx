// src/components/ActivityCalendar.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';

// --- Helper para los días de la semana ---
const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// --- Interfaz para los datos de un día ---
interface DayObject {
  day: number | null;
  monthType: 'prev' | 'current' | 'next';
  isToday: boolean;
  isWeekend: boolean;
  fullDate: string; // YYYY-MM-DD
}

// --- El Componente del Calendario ---
const ActivityCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Genera la matriz del calendario cada vez que cambia la fecha
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Lunes = 0
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: DayObject[] = [];

    // Días del mes anterior
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(currentYear, currentMonth - 1, day);
      days.push({
        day,
        monthType: 'prev',
        isToday: false,
        isWeekend: (new Date(currentYear, currentMonth-1, day).getDay() + 6) % 7 >= 5,
        fullDate: date.toISOString().split('T')[0],
      });
    }

    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      days.push({
        day: i,
        monthType: 'current',
        isToday: date.getTime() === today.getTime(),
        isWeekend: (date.getDay() + 6) % 7 >= 5,
        fullDate: date.toISOString().split('T')[0],
      });
    }

    // Días del mes siguiente para completar la última semana
    const totalCells = days.length;
    const remainder = totalCells % 7;
    if (remainder !== 0) {
      const cellsToAdd = 7 - remainder;
      for (let i = 1; i <= cellsToAdd; i++) {
        const date = new Date(currentYear, currentMonth + 1, i);
        days.push({
          day: i,
          monthType: 'next',
          isToday: false,
          isWeekend: (new Date(currentYear, currentMonth+1, i).getDay() + 6) % 7 >= 5,
          fullDate: date.toISOString().split('T')[0],
        });
      }
    }
    
    // Agrupar en semanas
    const weeks: DayObject[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return weeks;
  }, [currentMonth, currentYear]);

  return (
    <>
      <style jsx global>{`
        /* Estilos adaptados de tu CSS. Scoped para no afectar a toda la app */
        .ery-calendar-container {
          --primary-color: #4338ca; /* Indigo */
          --secondary-color: #374151; /* Gray-700 */
          --tertiary-color: #9ca3af; /* Gray-400 */
          --accent-color: #f59e0b; /* Amber-500 */
          width: 100%;
          padding: 1rem;
          background-color: #1f2937; /* Gray-800 */
          border-radius: 0.75rem;
          color: white;
        }
        .ery-calendar-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .ery-calendar-controls h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: white;
        }
        .ery-calendar-controls button {
          background: none;
          border: none;
          color: var(--tertiary-color);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 9999px;
          transition: background-color 0.2s;
        }
        .ery-calendar-controls button:hover {
            background-color: var(--secondary-color);
        }
        .ery-calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
        }
        .ery-calendar-weekday {
          text-align: center;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--tertiary-color);
        }
        .ery-calendar-day {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 2.5rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background-color 0.2s, color 0.2s;
        }
        .ery-calendar-day.current-month {
            color: #d1d5db; /* Gray-300 */
        }
        .ery-calendar-day.other-month {
            color: #4b5563; /* Gray-600 */
        }
        .ery-calendar-day.today {
            background-color: var(--primary-color);
            color: white;
            font-weight: 700;
        }
        .ery-calendar-day.completed { /* Ejemplo para marcar días */
            background-color: #16a34a; /* Green-600 */
            color: white;
        }
        .ery-calendar-day:not(.today):hover {
            background-color: var(--secondary-color);
        }
      `}</style>

      <div className="ery-calendar-container">
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
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="ery-calendar-weekday">{day}</div>
            ))}
          </div>
          <div className="space-y-2">
            {calendarGrid.map((week, weekIndex) => (
              <div key={weekIndex} className="ery-calendar-grid">
                {week.map((dayObj, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`ery-calendar-day 
                      ${dayObj.monthType === 'current' ? 'current-month' : 'other-month'}
                      ${dayObj.isToday ? 'today' : ''}
                      ${/* Aquí iría la lógica para añadir la clase 'completed' */ ''}
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

export default ActivityCalendar;
