import { useEffect, useState } from 'react'
import api from '../api'
import './CarAssignment.css'

function CarAssignment({ schedule, membersData, onBack, onLogout }) {
  const [selectedParticipants, setSelectedParticipants] = useState(new Set())
const sortedMembersData = membersData
  .map((member, index) => ({ ...member, originalIndex: index }))
  .sort((a, b) => {
    const yearA = a.enrollmentYear ?? Infinity
    const yearB = b.enrollmentYear ?? Infinity

    if (yearA !== yearB){
      return yearA - yearB
    }
    return a.name.localeCompare(b.name, 'ja')
  })
  
  const [assignments, setAssignments] = useState([])
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true)
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true)
  const [unassignmentPassengers, setUnassignmentPassengers] = useState([])
  const [showParticipants, setShowParticipants] = useState(true)

  // 保存済みの車割りを読み込む
useEffect(() => {
  const fetchAssignments = async () => {
    if (!schedule?.id) return

    try {
      setIsLoadingAssignments(true)
      const response = await api.get(`/api/assignments/${schedule.id}`)
      setIsLoadingParticipants(true)
      const data = response.data
      console.log('保存済みの車割り:', data.assignments)

      setAssignments(data.assignments)
      console.log('取得した車割り:', data.assignments)
      // 保存済みの参加者を選択状態にする
      const participantResponse = await api.get(
        `/api/participants/${schedule.id}`
      )

      const participantData = participantResponse.data
      console.log('保存済みの参加者ID:', participantData.participantIds)

if (participantResponse.status === 200) {
  const selectedMemberIds = membersData
    .filter(member => participantData.participantIds.includes(member.id))
    .map(member => member.id)

  setSelectedParticipants(new Set(selectedMemberIds))
  console.log('復元する参加者のID:', selectedMemberIds)
}
    } catch (error) {
      console.error('車割り取得エラー:', error)
    }finally{
      setIsLoadingAssignments(false)
      setIsLoadingParticipants(false)
    }
  }

  fetchAssignments()
}, [schedule?.id])

const handleParticipantToggle = (memberId) => {
  const newSelected = new Set(selectedParticipants)

  if (newSelected.has(memberId)) {
    newSelected.delete(memberId)
  } else {
    newSelected.add(memberId)
  }

  setSelectedParticipants(newSelected)
}
// 車割り作成のロジック
const calcDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // 地球の半径 (km)
  const toRad = (degree) => degree * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) **2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // 距離 (km)
}


const handleCreateAssignments = async() => {
    const participants = membersData.filter(member =>
  selectedParticipants.has(member.id)
)

    console.log('Selected Participants:', participants)
    console.log('Driver Candidates:', participants.filter(member => member.hasCar))

    const drivers = participants.filter(member => member.hasCar)
    const passengers = participants.filter(member => !member.hasCar)

    const newAssignments = drivers.map(driver => ({
      driver: driver, 
      passengers: [],
    }))
    
    const unassignmened = []

    passengers.forEach(passenger => {
      const availableCars = newAssignments.filter(
        assignment => assignment.passengers.length < assignment.driver.capacity - 1
      )

      if (availableCars.length === 0){
        unassignmened.push(passenger)
        return
      }

      const nearestCar = availableCars.reduce((nearest, current) => {
      const nearestDistance = calcDistance(
        passenger.latitude, passenger.longitude, nearest.driver.latitude, nearest.driver.longitude)

      const currentDistance = calcDistance(
        passenger.latitude, passenger.longitude, current.driver.latitude, current.driver.longitude)

      return currentDistance < nearestDistance ? current : nearest
      })

      nearestCar.passengers.push(passenger)
    })

    setAssignments(newAssignments)
    setShowParticipants(false)
    setUnassignmentPassengers(unassignmened)
    console.log('Assignments:', newAssignments)

try {
  await api.post('/api/assignments', {
    scheduleId: schedule.id,
    participantIds: participants.map(member => member.id),
    assignments: newAssignments.map(assignment => ({
      driverId: assignment.driver.id,
      passengerIds: assignment.passengers.map(passenger => passenger.id)
    }))
  })

  console.log('車割りを保存しました')
} catch (error) {
  console.error('車割り保存エラー:', error)
}
}

   

const handleCopyAssignments = async () => {
  const text = [
    '【車割り結果】',
    ...assignments.map((assignment) => {
      const passengers = assignment.passengers
        .map((passenger) => `・${passenger.name}`)
        .join('\n')

      return [
        `🚗 ${assignment.driver.name}カー（${assignment.passengers.length + 1}/${assignment.driver.capacity}名）`,
        passengers,
      ]
        .filter(Boolean)
        .join('\n')
    }),
    ...(unassignmentPassengers.length > 0
      ? [
          '',
          '⚠️ 車が足りません',
          ...unassignmentPassengers.map((member) => `・${member.name}`),
        ]
      : []),
  ].join('\n\n')

  try {
    await navigator.clipboard.writeText(text)
    alert('車割り結果をコピーしました！')
  } catch (error) {
    console.error('コピーに失敗しました:', error)
    alert('コピーに失敗しました。')
  }
}



  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00')
    const weekDays = ['日', '月', '火', '水', '木', '金', '土']
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekDay = weekDays[date.getDay()]
    return `${month}/${day} (${weekDay})`
  }

  const selectedParticipantsData = membersData.filter(member =>
  selectedParticipants.has(member.id)
)
  const driverCandidates = selectedParticipantsData.filter(member => member.hasCar)

  return (
  
  <div className="car-assignment-container">
      <header className="dashboard-header">
        <div className="header-left">
          <button onClick={onBack} className="back-button">←</button>
          <h1>🚗 車割り作成</h1>
        </div>

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

            <button className="toggle-participants-button" onClick={() => setShowParticipants(!showParticipants)}>
              {showParticipants ? '▲ 閉じる' : '▼ 参加者を表示'}
            </button>
            <div className="participant-count">
              <span>参加者：{selectedParticipants.size}名</span>
              <span>車を持つ人：{driverCandidates.length}名</span>
            </div>
          </div>

          {showParticipants && (
          <div className="members-list">
            {isLoadingParticipants ? (
              <p className="loading-message">参加者取得中...</p>
            ) : 
            membersData.length > 0 ? (
              sortedMembersData.map((member) => (
  <div
    key={member.id}
    className={`participant-card ${selectedParticipants.has(member.id) ? 'selected' : ''}`}
    onClick={() => handleParticipantToggle(member.id)}
  >
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
        )}
        </div>
        

        <div className="assignment-actions">
          <button
            className="create-button"
            disabled={selectedParticipants.size === 0}
            onClick={handleCreateAssignments}
          >
            車割りを作成
          </button>

          <button onClick={onBack} className="cancel-button">
            キャンセル
          </button>
        </div>


        {assignments.length > 0 && (
          <div className="assignment-result">
            <h2>車割り結果</h2>

            <button
            className="copy-button" onClick={handleCopyAssignments}
            >
              📋 車割り結果をコピー
              </button>

            {unassignmentPassengers.length > 0 && (
              <div className="unassigned-passengers">
                <h3>⚠️ 車が足りません</h3>
                <p>以下の参加者は車に割り当てられていません。</p>

                <div className="unassigned-list">
                  {unassignmentPassengers.map((member, index) => (
                    <div key={index} className="unassigned-member">
                      {member.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLoadingAssignments ? (
              <p className="loading-message">車割り取得中...</p>
            ) : (
              assignments.map((assignment, index) => (
              <div key={index} className="assignment-card">
                <div className="assignment-card-header">
                  <h3>🚗 {assignment.driver.name}カー</h3>
                  <span className="assignment-count">
                    {assignment.passengers.length + 1}/{assignment.driver.capacity}名
                  </span>
                </div>

                <div className="assignment-passengers">
                  {assignment.passengers.map((passenger, passengerIndex) => (
                    <div key={passengerIndex} className="assignment-passenger">
                      {passenger.name}
                    </div>
                  ))}
                </div>
              </div>
            )))}
          </div>
        )}

        
      </div>
    </div>
)}

export default CarAssignment
