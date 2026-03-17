import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'

export default function AdminEnvironment() {
  const [logs, setLogs] = useState([])
  useEffect(() => { adminAPI.getEnvironmentLogs().then(r => setLogs(r.data.logs||[])).catch(() => setLogs(MOCK)) }, [])

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-swiggy-dark mb-2">Environmental Monitoring</h1>
      <p className="text-sm text-swiggy-gray-dark mb-5">Weather, AQI and conditions captured at each delivery — feeds the AI insurance model</p>

      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label:'Avg AQI today', value:'165', warn: true },
          { label:'Max Rainfall', value:'42mm/h', warn: true },
          { label:'Avg Temp', value:'28°C', warn: false },
          { label:'Visibility', value:'8.2km', warn: false },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.warn ? 'bg-amber-50' : 'bg-green-50'}`}>
            <div className={`text-xl font-bold ${s.warn ? 'text-amber-700' : 'text-green-700'}`}>{s.value}</div>
            <div className="text-xs text-swiggy-gray-dark mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead><tr className="bg-gray-50 text-xs text-swiggy-gray-dark border-b border-gray-200">
            <th className="text-left px-4 py-3">Order</th>
            <th className="text-left px-4 py-3">Worker</th>
            <th className="text-left px-4 py-3">Zone</th>
            <th className="text-left px-4 py-3">Temp</th>
            <th className="text-left px-4 py-3">AQI</th>
            <th className="text-left px-4 py-3">Rainfall</th>
            <th className="text-left px-4 py-3">Condition</th>
            <th className="text-left px-4 py-3">PM2.5</th>
            <th className="text-left px-4 py-3">Time</th>
          </tr></thead>
          <tbody>
            {logs.map((l,i) => (
              <tr key={l.id||i} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-swiggy-dark text-xs">{l.order_number||'—'}</td>
                <td className="px-4 py-2.5 text-swiggy-gray-dark text-xs">{l.worker_name||'—'}</td>
                <td className="px-4 py-2.5 text-swiggy-gray-dark text-xs">{l.delivery_zone||'—'}</td>
                <td className="px-4 py-2.5 text-swiggy-dark">{l.temperature_celsius ? `${l.temperature_celsius}°C` : '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs font-medium ${(l.aqi||0)>200?'text-red-600':(l.aqi||0)>100?'text-amber-600':'text-green-600'}`}>{l.aqi||'—'}</span>
                </td>
                <td className="px-4 py-2.5 text-xs">{l.rainfall_mm_per_hour ? `${l.rainfall_mm_per_hour}mm/h` : '0mm/h'}</td>
                <td className="px-4 py-2.5 text-swiggy-gray-dark text-xs">{l.weather_condition||'—'}</td>
                <td className="px-4 py-2.5 text-swiggy-gray-dark text-xs">{l.pm25||'—'}</td>
                <td className="px-4 py-2.5 text-swiggy-gray-dark text-xs">{l.recorded_at ? new Date(l.recorded_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const MOCK = [
  { id:'1', order_number:'ORD-4521', worker_name:'Ravi Kumar', delivery_zone:'Zone A', temperature_celsius:28, aqi:165, rainfall_mm_per_hour:12, weather_condition:'Rain', pm25:35.2, recorded_at:new Date().toISOString() },
  { id:'2', order_number:'ORD-4519', worker_name:'Meena Patel', delivery_zone:'Zone B', temperature_celsius:27, aqi:210, rainfall_mm_per_hour:42, weather_condition:'Heavy Rain', pm25:55.8, recorded_at:new Date().toISOString() },
  { id:'3', order_number:'ORD-4515', worker_name:'Arjun Singh', delivery_zone:'Zone C', temperature_celsius:30, aqi:85, rainfall_mm_per_hour:0, weather_condition:'Clear', pm25:18.4, recorded_at:new Date().toISOString() },
]
