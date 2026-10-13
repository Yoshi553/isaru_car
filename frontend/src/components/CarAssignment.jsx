import { useState } from 'react'
import './CarAssignment.css'

function CarAssignment({ schedule, membersData, onBack, onLogout }) {
  const [selectedParticipants, setSelectedParticipants] = useState(new Set())

  const handleParticipantToggle = (index) => {
    const newSelected = new Set(selectedParticipants)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedParticipants(newSelected)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00')
    const weekDays = ['日', '月', '火', '水', '木', '金', '土']
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekDay = weekDays[date.getDay()]
    return `${month}/${day} (${weekDay})`
  }

  const selectedParticipantsData = Array.from(selectedParticipants).map(index => membersData[index])
  const driverCandidates = selectedParticipantsData.filter(member => member.hasCar)

  return (
    <div className="car-assignment-container">
      <header className="dashboard-header">
        <div className="header-left">
          <button onClick={onBack} className="back-button">←</button>
          <h1>🚗 車割り作成</h1>
        </div>
        <button onClick={onLogout} className="logout-button">ログアウト</button>
      </header>

      <div className="assignment-content">
        <div className="schedule-info">
          <h2>練習情報</h2>
          <div className="schedule-detail">
            <div className="detail-row">
              <span className="detail-label">📅 日付</span>
              <span className="detail-value">{formatDate(schedule.date)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">🕐 時間</span>
              <span className="detail-value">{schedule.time}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">📍 場所</span>
              <span className="detail-value">{schedule.location}</span>
            </div>
            {schedule.notes && (
              <div className="detail-row">
                <span className="detail-label">📝 備考</span>
                <span className="detail-value">{schedule.notes}</span>
              </div>
            )}
          </div>
        </div>

        <div className="participants-section">
          <div className="participants-header">
            <h2>参加者選択</h2>
            <span className="participant-count">{selectedParticipants.size}名</span>
          </div>

          <div className="members-list">
            {membersData.length > 0 ? (
              membersData.map((member, index) => (
                <div key={index} className={`participant-card ${selectedParticipants.has(index) ? 'selected' : ''}`} onClick={() => handleParticipantToggle(index)}>
                  <div className="participant-info">
                    <div className="participant-name">{member.name}</div>
                    {member.hasCar && (
                      <div className="participant-car">🚗 {member.capacity}名</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-message">メンバーがまだ登録されていません</div>
            )}
          </div>
        </div>

        {selectedParticipants.size > 0 && (
          <div className="assignment-summary">
            <h2>車割りサマリー</h2>
            <div className="summary-content">
              <div className="summary-row">
                <span>総参加者数:</span>
                <strong>{selectedParticipants.size}名</strong>
              </div>
              <div className="summary-row">
                <span>車を持つ人:</span>
                <strong>{driverCandidates.length}名</strong>
              </div>
              {driverCandidates.length > 0 && (
                <div className="drivers-list">
                  <span>運転者:</span>
                  <div className="drivers">
                    {driverCandidates.map((driver, index) => (
                      <div key={index} className="driver-badge">
                        {driver.name} ({driver.capacity}名)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="assignment-actions">
          <button onClick={onBack} className="cancel-button">キャンセル</button>
          <button 
            className="create-button"
            disabled={selectedParticipants.size === 0}
          >
            車割りを作成
          </button>
        </div>
      </div>
    </div>
  )
}

export default CarAssignment
