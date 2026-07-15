import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { api } from '../../lib/api.js'

const reportTypes = [
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'three_months', label: 'Last 3 Months' },
  { value: 'year', label: 'Yearly' },
]

export function Reports() {
  const [type, setType] = useState('month')
  const [studentId, setStudentId] = useState('')
  const [belowPercent, setBelowPercent] = useState('')
  const [data, setData] = useState({ subjects: [], rows: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadReport() {
      setLoading(true)
      setError('')

      try {
        const params = { type }
        if (studentId.trim()) params.studentId = studentId.trim()
        if (belowPercent !== '') params.belowPercent = belowPercent

        const res = await api.get('/reports/attendance', { params })
        if (mounted) setData(res.data)
      } catch (e) {
        if (mounted) setError(e?.response?.data?.error || e.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadReport()

    return () => {
      mounted = false
    }
  }, [type, studentId, belowPercent])

  const subjects = useMemo(() => data.subjects || [], [data.subjects])
  const rows = useMemo(() => data.rows || [], [data.rows])

  const downloadReport = () => {
    if (!rows.length) {
      alert('No data to download')
      return
    }

    const exportData = rows.map((row) => {
      const obj = {
        'Student ID': row.studentId,
        'Name': row.name,
      }
      subjects.forEach((subject) => {
        const value = row.percentages?.[subject.id]
        obj[subject.code] = value === null || value === undefined ? '-' : `${value}%`
      })
      obj['Overall %'] = `${row.overallPercent}%`
      return obj
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report')
    saveAs(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })]), 'Attendance_Report.xlsx')
  }

  return (
    <div className="sm-page">
      <div>
        <div className="sm-page-title">Attendance Reports</div>
        <div className="sm-page-subtitle">College-style subject-wise attendance report.</div>
      </div>

      <div className="sm-card sm-card-body grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Report type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 sm-input">
            {reportTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Student ID</label>
          <input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="mt-1 sm-input"
            placeholder="All students"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Below %</label>
          <input
            value={belowPercent}
            onChange={(e) => setBelowPercent(e.target.value)}
            className="mt-1 sm-input"
            type="number"
            min="0"
            max="100"
            placeholder="Example: 75"
          />
        </div>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="sm-table-wrap">
        <div className="sm-card-header">
          <div className="sm-card-title">{loading ? 'Loading report...' : 'Report Table'}</div>
          {rows.length > 0 && (
            <button
              onClick={downloadReport}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
            >
              Download Excel
            </button>
          )}
        </div>

        <div className="overflow-auto">
          <table className="sm-table">
            <thead className="sm-thead">
              <tr>
                <th className="sm-th">Student ID</th>
                <th className="sm-th">Name</th>
                {subjects.map((subject) => (
                  <th key={subject.id} className="sm-th text-right">
                    {subject.code}
                  </th>
                ))}
                <th className="sm-th text-right">Overall %</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr key={row.studentUserId} className="sm-tr">
                    <td className="sm-td">{row.studentId}</td>
                    <td className="sm-td">{row.name}</td>
                    {subjects.map((subject) => {
                      const value = row.percentages?.[subject.id]
                      return (
                        <td key={subject.id} className="sm-td text-right">
                          {value === null || value === undefined ? '-' : `${value}%`}
                        </td>
                      )
                    })}
                    <td className="sm-td text-right font-semibold">{row.overallPercent}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="sm-empty" colSpan={subjects.length + 3}>
                    No report data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
