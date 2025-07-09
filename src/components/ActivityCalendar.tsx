// src/components/ActivityCalendar.tsx
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


// --- Helpers ---
const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Helper para parsear fechas 'YYYY-MM-DD' como locales y evitar bugs de UTC
function parseDateAsLocal(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

// --- Componente del Calendario ---
const ActivityCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activityData, setActivityData] = useState<ActivityMap>({});
  const [isLoading, setIsLoading] = useState(true);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // --- Lógica para obtener datos de la API ---
  const fetchActivityData = useCallback(async (year: number, month: number) => {
    setIsLoading(true);
    try {
        const response = await fetch(`/api/activity-log?year=${year}&month=${month + 1}`);
        if (!response.ok) throw new Error('No se pudo cargar la actividad.');
        const data: ActivityMap = await response.json();
        setActivityData(data);
    } catch (error) {
        console.error("Error fetching activity data:", error);
        setActivityData({}); // Limpiar datos en caso de error
    } finally {
        setIsLoading(false);
    }
  }, []);
  
  // Vuelve a cargar los datos cuando cambia el mes/año
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

  const getActivityLevel = (day: DayObject): { level: number; hasRelapse: boolean } => {
    if (day.monthType !== 'current') return { level: 0, hasRelapse: false };
    
    const activity = activityData[day.fullDate];
    if (!activity) return { level: 0, hasRelapse: false };
    
    if (activity.hasRelapse) return { level: 0, hasRelapse: true };
    
    const completions = activity.completions;
    if (completions >= 5) return { level: 4, hasRelapse: false };
    if (completions >= 3) return { level: 3, hasRelapse: false };
    if (completions >= 1) return { level: 2, hasRelapse: false };
    
    return { level: 1, hasRelapse: false };
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 p-8 rounded-2xl shadow-xl border border-gray-700/50 backdrop-blur-sm relative overflow-hidden">
      {/* Overlay de carga */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl">
          <div className="flex items-center gap-3 text-white">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-lg font-medium">Cargando actividad...</span>
          </div>
        </div>
      )}
      
      {/* Encabezado del calendario */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
            </svg>
          </div>
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
              Calendario de Actividad
            </h3>
            <p className="text-gray-400 text-sm">Tu progreso diario visualizado</p>
          </div>
        </div>
        
        {/* Controles de navegación */}
        <div className="flex items-center gap-4">
          <button 
            onClick={handlePrevMonth}
            className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-300 hover:scale-110 group"
            aria-label="Mes anterior"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          
          <div className="text-center px-4">
            <h2 className="text-xl font-bold text-white capitalize">
              {new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(currentDate)}
            </h2>
          </div>
          
          <button 
            onClick={handleNextMonth}
            className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-300 hover:scale-110 group"
            aria-label="Mes siguiente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {DAYS_OF_WEEK.map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Grilla del calendario */}
      <div className="space-y-2">
        {calendarGrid.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2">
            {week.map((dayObj, dayIndex) => {
              const { level, hasRelapse } = getActivityLevel(dayObj);
              return (
                <div
                  key={dayIndex}
                  className={`
                    relative h-12 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-300 cursor-pointer group
                    ${
                      dayObj.monthType === 'current'
                        ? 'text-white hover:scale-110 hover:shadow-lg'
                        : 'text-gray-600 pointer-events-none'
                    }
                    ${
                      dayObj.isToday
                        ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-gray-800 font-bold'
                        : ''
                    }
                    ${
                      level === 0 && !hasRelapse && dayObj.monthType === 'current'
                        ? 'bg-gray-700/50 hover:bg-gray-600/50'
                        : level === 1
                        ? 'bg-gray-600/50'
                        : level === 2
                        ? 'bg-emerald-500/30 hover:bg-emerald-500/40'
                        : level === 3
                        ? 'bg-emerald-500/60 hover:bg-emerald-500/70'
                        : level === 4
                        ? 'bg-emerald-500/90 hover:bg-emerald-500'
                        : ''
                    }
                  `}
                >
                  {dayObj.day}
                  {hasRelapse && (
                    <div className="absolute bottom-1 right-1 w-2 h-2 bg-red-500 rounded-full shadow-lg animate-pulse"></div>
                  )}
                  {level > 0 && !hasRelapse && (
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-sm"></div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className="mt-8 pt-6 border-t border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 font-medium">Menos</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-700/50 rounded-sm"></div>
              <div className="w-3 h-3 bg-emerald-500/30 rounded-sm"></div>
              <div className="w-3 h-3 bg-emerald-500/60 rounded-sm"></div>
              <div className="w-3 h-3 bg-emerald-500/90 rounded-sm"></div>
            </div>
            <span className="text-sm text-gray-400 font-medium">Más</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>Recaída</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
              <span>Actividad</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityCalendar;
