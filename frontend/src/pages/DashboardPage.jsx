import { useState, useEffect } from 'react'
import axios from 'axios'
import Schedule from '../components/Schedule'
import Members from '../components/Members'
import CarAssignment from '../components/CarAssignment'
import './DashboardPage.css'

function DashboardPage({ onLogout }) {
  const [scheduleData, setScheduleData] = useState({})
  const [membersData, setMembersData] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [activeTab, setActiveTab] = useState('schedule')
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const [scheduleRes, membersRes] = await Promise.all([
        axios.get('/api/schedule'),
        axios.get('/api/members')
      ])
      setScheduleData(scheduleRes.data.schedule || {})
      setMembersData(membersRes.data.members || [])
    } catch (err) {
      setError('データの取得に失敗しました')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleScheduleSelect = (schedule) => {
    setSelectedSchedule(schedule)
    setCurrentPage('carAssignment')
  }

  const handleBackToDashboard = () => {
    setCurrentPage('dashboard')
    setSelectedSchedule(null)
  }

  if (isLoading) {
    return <div className="dashboard-loading">読み込み中...</div>
  }

  if (currentPage === 'carAssignment' && selectedSchedule) {
    return (
      <CarAssignment 
        schedule={selectedSchedule} 
        membersData={membersData}
        onBack={handleBackToDashboard}
        onLogout={onLogout}
      />
    )
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>🚗 車割りアプリ</h1>
        <button onClick={onLogout} className="logout-button">ログアウト</button>
      </header>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          ⚽️ 練習日程
        </button>
        <button 
          className={`tab-button ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          👥 メンバー
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'schedule' && (
          <section className="dashboard-section">
            <Schedule 
              scheduleData={scheduleData}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              onScheduleAdded={fetchData}
              onScheduleSelect={handleScheduleSelect}
            />
          </section>
        )}

        {activeTab === 'members' && (
          <section className="dashboard-section">
            <Members membersData={membersData} onMemberAdded={fetchData} />
          </section>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
