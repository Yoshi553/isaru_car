import { useState, useEffect } from 'react'
import api from '../api'
import './Members.css'

function Members({ membersData, onMemberAdded }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState(new Set())
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedMemberIndex, setSelectedMemberIndex] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editFormData, setEditFormData] = useState({
    originalName: '',
    name: '', 
    hasCar: 'no',
    latitude: '',
    longitude: '',
    pickupLocation: '',
    capacity: ''
  })
  const [editFormError, setEditFormError] = useState('')
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    hasCar: 'no',
    latitude: '',
    longitude: '',
    pickupLocation: '',
    capacity: ''
  })

  // 送迎場所一覧
  const [pickupLocations, setPickupLocations] = useState([])

// Supabaseから送迎場所一覧を取得
  useEffect(() => {
    const fetchPickupLocations = async () => {
      try {
        const response = await api.get('/api/pickup-locations')
        setPickupLocations(response.data.locations)
      } catch (error) {
        console.error('送迎場所の取得に失敗しました:', error)
      }
    }

  fetchPickupLocations()
  }, [])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target

    if (name == 'pickupLocation') {
      const matchedMember = membersData.find(
        member => member.pickupLocation?.trim() === value.trim() && value.trim() !== ''
      )

      if (matchedMember) {
        setFormData(prev => ({
          ...prev,
          pickupLocation: value,
          latitude: String(matchedMember.latitude),
          longitude: String(matchedMember.longitude)
        }))
        return
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    // バリデーション
    if (!formData.name || !formData.latitude || !formData.longitude || !formData.pickupLocation) {
      setFormError('名前、緯度、経度、送迎場所の名前は必須です')
      return
    }

    // 車がある場合は乗車可能人数の確認
    if (formData.hasCar === 'yes' && !formData.capacity) {
      setFormError('車がある場合は乗車可能人数を選択してください')
      return
    }

    setIsSubmitting(true)
    try {
      await api .post('/api/members', {
        name: formData.name,
        hasCar: formData.hasCar === 'yes',
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        pickupLocation: formData.pickupLocation,
        capacity: formData.hasCar === 'yes' ? parseInt(formData.capacity) : null
      })
      setFormData({
        name: '',
        hasCar: 'no',
        latitude: '',
        longitude: '',
        pickupLocation: '',
        capacity: ''
      })
      setShowAddForm(false)
      if (onMemberAdded) {
        onMemberAdded()
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'メンバーの追加に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseForm = () => {
    setShowAddForm(false)
    setFormData({
      name: '',
      hasCar: 'no',
      latitude: '',
      longitude: '',
      pickupLocation: '',
      capacity: ''
    })
    setFormError('')
  }

  const handleDeleteMember = async (index) => {
    if (window.confirm('このメンバーを削除しますか？')) {
      try {
        const member = membersData[index]
        
        await api.delete('/api/members', {
          data: {
            name: member.name
          }
        })
        
        if (onMemberAdded) {
          onMemberAdded()
        }
      } catch (err) {
        alert('メンバーの削除に失敗しました')
      }
    }
  }

  const handleMemberSelect = (index) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedMembers(newSelected)
  }

  const handleEditStart = () => {
    const member = membersData[selectedMemberIndex]
    setEditFormData({
      originalName: member.name,
      name: member.name,
      hasCar: member.hasCar ? 'yes' : 'no',
      latitude: member.latitude.toString(),
      longitude: member.longitude.toString(),
      pickupLocation: member.pickupLocation,
      capacity: member.capacity ? member.capacity.toString() : ''
    })
    setEditMode(true)
    setEditFormError('')
  }

  const handleEditInputChange = (e) => {
    const { name, value } = e.target
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setEditFormError('')
    setIsEditSubmitting(true)

    try {
      const { originalName, name, hasCar, latitude, longitude, pickupLocation, capacity } = editFormData

      if (!name || !latitude || !longitude || !pickupLocation) {
        setEditFormError('すべての項目を入力してください')
        setIsEditSubmitting(false)
        return
      }

      if (hasCar === 'yes' && !capacity) {
        setEditFormError('車がある場合は乗車可能人数を指定してください')
        setIsEditSubmitting(false)
        return
      }

      await axios.put('/api/members', {
        originalName: originalName,
        name: name,
        hasCar: hasCar === 'yes',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        pickupLocation: pickupLocation,
        capacity: hasCar === 'yes' ? parseInt(capacity) : null
      })

      setEditMode(false)
      setShowDetailModal(false)
      if (onMemberAdded) {
        onMemberAdded()
      }
    } catch (err) {
      setEditFormError(err.response?.data?.message || 'メンバーの編集に失敗しました')
    } finally {
      setIsEditSubmitting(false)
    }
  }

  const cancelEditMode = () => {
    setEditMode(false)
    setEditFormError('')
    setEditFormData({
      originalName: '',
      name: '',
      hasCar: 'no',
      latitude: '',
      longitude: '',
      pickupLocation: '',
      capacity: ''
    })
  }

  const handleDeleteSelectedMembers = async () => {
    if (selectedMembers.size === 0) {
      alert('削除するメンバーを選択してください')
      return
    }

    if (window.confirm(`${selectedMembers.size}人のメンバーを削除しますか？`)) {
      try {
        const membersToDelete = Array.from(selectedMembers).map(index => membersData[index])
        
        await Promise.all(
          membersToDelete.map(member =>
            axios.delete('/api/members', {
              data: { name: member.name }
            })
          )
        )
        
        setSelectedMembers(new Set())
        setDeleteMode(false)
        if (onMemberAdded) {
          onMemberAdded()
        }
      } catch (err) {
        alert('メンバーの削除に失敗しました')
      }
    }
  }

  const toggleDeleteMode = () => {
    setDeleteMode(!deleteMode)
    setSelectedMembers(new Set())
  }

  const cancelDeleteMode = () => {
    setDeleteMode(false)
    setSelectedMembers(new Set())
  }

  return (
    <div className="members-container">
      <div className="members-header">
        <div className="header-title">
          <h2>👥 メンバー</h2>
          <span className="member-count">{membersData.length}名</span>
        </div>
        <div className="header-controls">
          <button 
            onClick={() => setShowAddForm(true)}
            className="add-member-btn"
          >
            ➕ メンバー追加
          </button>
          
          {deleteMode ? (
            <>
              <button 
                onClick={handleDeleteSelectedMembers}
                className={`delete-members-btn ${selectedMembers.size > 0 ? 'active' : ''}`}
              >
                🗑️ 削除 ({selectedMembers.size})
              </button>
              <button 
                onClick={cancelDeleteMode}
                className="cancel-delete-btn"
              >
                キャンセル
              </button>
            </>
          ) : (
            <button 
              onClick={toggleDeleteMode}
              className="delete-mode-btn"
            >
              🗑️ 削除
            </button>
          )}
        </div>
      </div>

      <div className="members-grid">
        {membersData.length > 0 ? (
          membersData.map((member, index) => (
            <div 
              key={index} 
              className={`member-card ${deleteMode && selectedMembers.has(index) ? 'selected' : ''}`}
              onClick={() => {
                if (deleteMode) {
                  handleMemberSelect(index)
                } else {
                  setSelectedMemberIndex(index)
                  setShowDetailModal(true)
                }
              }}
            >
              {deleteMode && (
                <label className="member-checkbox" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedMembers.has(index)}
                    onChange={() => handleMemberSelect(index)}
                  />
                </label>
              )}
              <div className="member-name">{member.name}</div>
              {member.hasCar && (
                <div className="member-car">🚗 {member.capacity}名</div>
              )}
            </div>
          ))
        ) : (
          <div className="empty-message">
            メンバーがまだ登録されていません
          </div>
        )}
      </div>

      {/* メンバー追加モーダル */}
      {showAddForm && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>メンバーを追加</h3>
              <button 
                onClick={handleCloseForm}
                className="close-btn"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="add-member-form">
              {formError && (
                <div className="form-error">{formError}</div>
              )}

              <div className="form-group">
                <label htmlFor="name">名前 *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="たろう"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>車の有無 *</label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="hasCar"
                      value="no"
                      checked={formData.hasCar === 'no'}
                      onChange={handleInputChange}
                    />
                    なし
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="hasCar"
                      value="yes"
                      checked={formData.hasCar === 'yes'}
                      onChange={handleInputChange}
                    />
                    あり
                  </label>
                </div>
              </div>

              {formData.hasCar === 'yes' && (
                <div className="form-group">
                  <label htmlFor="capacity">乗車可能人数（運転手含む） *</label>
                  <select
                    id="capacity"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">選択してください</option>
                    <option value="2">2人</option>
                    <option value="3">3人</option>
                    <option value="4">4人</option>
                    <option value="5">5人</option>
                    <option value="6">6人</option>
                    <option value="7">7人</option>
                    <option value="8">8人以上</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="latitude">緯度 *</label>
                <input
                  type="number"
                  id="latitude"
                  name="latitude"
                  placeholder="例)35.6762"
                  step="0.0001"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="longitude">経度 *</label>
                <input
                  type="number"
                  id="longitude"
                  name="longitude"
                  placeholder="例)140.7674"
                  step="0.0001"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="pickupLocation">送迎場所の名前 *</label>
                <input
                  type="text"
                  id="pickupLocation"
                  name="pickupLocation"
                  placeholder="例)春4ファミマ"
                  value={formData.pickupLocation}
                  onChange={handleInputChange}
                  required
                />

                {formData.pickupLocation.trim() !== '' && (
                  <div className="location-suggestions">
                  {pickupLocations
                    .filter(location =>
                      location.name.includes(formData.pickupLocation.trim())
                    )
                    .map(location => (
                      <button
                        key={location.id}
                        type="button"
                        className="location-suggestion"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            pickupLocation: location.name,
                            latitude: String(location.latitude),
                            longitude: String(location.longitude)
                          }))
                        }}
                      >
                        {location.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button 
                  type="button"
                  onClick={handleCloseForm}
                  className="cancel-btn"
                  disabled={isSubmitting}
                >
                  キャンセル
                </button>
                <button 
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '追加中...' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* メンバー詳細情報モーダル */}
      {showDetailModal && selectedMemberIndex !== null && membersData[selectedMemberIndex] && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editMode ? 'メンバーを編集' : 'メンバー詳細'}</h3>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            
            {!editMode ? (
              <>
                <div className="detail-content">
                  <div className="detail-item">
                    <label>名前</label>
                    <p>{membersData[selectedMemberIndex].name}</p>
                  </div>

                  <div className="detail-item">
                    <label>車の有無</label>
                    <p>{membersData[selectedMemberIndex].hasCar ? 'あり' : 'なし'}</p>
                  </div>

                  {membersData[selectedMemberIndex].hasCar && (
                    <div className="detail-item">
                      <label>乗車可能人数</label>
                      <p>{membersData[selectedMemberIndex].capacity}名</p>
                    </div>
                  )}

                  <div className="detail-item">
                    <label>送迎場所の名前</label>
                    <p>{membersData[selectedMemberIndex].pickupLocation}</p>
                  </div>

                  <div className="detail-item">
                    <label>緯度</label>
                    <p>{membersData[selectedMemberIndex].latitude}</p>
                  </div>

                  <div className="detail-item">
                    <label>経度</label>
                    <p>{membersData[selectedMemberIndex].longitude}</p>
                  </div>
                </div>

                <div className="detail-actions">
                  <button 
                    onClick={() => setShowDetailModal(false)}
                    className="detail-close-btn"
                  >
                    閉じる
                  </button>
                  <button 
                    onClick={handleEditStart}
                    className="detail-edit-btn"
                  >
                    ✏️ 編集
                  </button>
                </div>
              </>
            ) : (
              <>
                <form onSubmit={handleEditSubmit} className="edit-member-form">
                  {editFormError && (
                    <div className="form-error">{editFormError}</div>
                  )}

                  <div className="form-group">
                    <label htmlFor="edit-name">名前 *</label>
                    <input
                      type="text"
                      id="edit-name"
                      name="name"
                      placeholder="たろう"
                      value={editFormData.name}
                      onChange={handleEditInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>車の有無 *</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="hasCar"
                          value="yes"
                          checked={editFormData.hasCar === 'yes'}
                          onChange={handleEditInputChange}
                        />
                        あり
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="hasCar"
                          value="no"
                          checked={editFormData.hasCar === 'no'}
                          onChange={handleEditInputChange}
                        />
                        なし
                      </label>
                    </div>
                  </div>

                  {editFormData.hasCar === 'yes' && (
                    <div className="form-group">
                      <label htmlFor="edit-capacity">乗車可能人数 *</label>
                      <select
                        id="edit-capacity"
                        name="capacity"
                        value={editFormData.capacity}
                        onChange={handleEditInputChange}
                        required
                      >
                        <option value="">選択してください</option>
                        <option value="2">2人</option>
                        <option value="3">3人</option>
                        <option value="4">4人</option>
                        <option value="5">5人</option>
                        <option value="6">6人</option>
                        <option value="7">7人</option>
                        <option value="8">8人以上</option>
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="edit-pickupLocation">送迎場所の名前 *</label>
                    <input
                      type="text"
                      id="edit-pickupLocation"
                      name="pickupLocation"
                      placeholder="◯◯駅"
                      value={editFormData.pickupLocation}
                      onChange={handleEditInputChange}
                      required
                    />

                    {editFormData.pickupLocation.trim() !== '' && (
                      <div className="location-suggestions">
                        {pickupLocations
                          .filter(location =>
                            location.name.includes(editFormData.pickupLocation.trim())
                          )
                          .map(location => (
                            <button
                              key={location.id}
                              type="button"
                              className="location-suggestion"
                              onClick={() => {
                                setEditFormData(prev => ({
                                ...prev,
                                pickupLocation: location.name,
                                latitude: String(location.latitude),
                                longitude: String(location.longitude)
                              }))
                            }}
                            >
                             {location.name}
                            </button>
                          ))}
                        </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-latitude">緯度 *</label>
                    <input
                      type="number"
                      id="edit-latitude"
                      name="latitude"
                      placeholder="35.6762"
                      step="0.0001"
                      value={editFormData.latitude}
                      onChange={handleEditInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-longitude">経度 *</label>
                    <input
                      type="number"
                      id="edit-longitude"
                      name="longitude"
                      placeholder="139.7674"
                      step="0.0001"
                      value={editFormData.longitude}
                      onChange={handleEditInputChange}
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button 
                      type="button"
                      onClick={cancelEditMode}
                      className="cancel-btn"
                      disabled={isEditSubmitting}
                    >
                      キャンセル
                    </button>
                    <button 
                      type="submit"
                      className="submit-btn"
                      disabled={isEditSubmitting}
                    >
                      {isEditSubmitting ? '編集中...' : '編集完了'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Members
