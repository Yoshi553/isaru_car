import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY
)

const app = express()
const PORT = process.env.PORT || 3001
const PASSPHRASE = process.env.PASSPHRASE

// ミドルウェア
app.use(cors())
app.use(express.json())

// モックデータ: 練習日程
const scheduleData = {
  '2026-10': [
    {
      date: '2026-10-09',
      time: '19-22',
      location: '豊里',
      notes: ''
    },
    {
      date: '2026-10-10',
      time: '19-21',
      location: 'セキショウ',
      notes: ''
    }
  ]
}

// モックデータ: メンバー
const membersData = [
  { name: '太郎', hasCar: true, latitude: 35.6762, longitude: 139.7674, pickupLocation: '渋谷駅', capacity: 4 },
  { name: '次郎', hasCar: true, latitude: 35.6812, longitude: 139.7671, pickupLocation: '原宿駅', capacity: 5 },
  { name: '花子', hasCar: false, latitude: 35.6895, longitude: 139.6917, pickupLocation: '新宿駅', capacity: null },
  { name: '美咲', hasCar: false, latitude: 35.6615, longitude: 139.7454, pickupLocation: '品川駅', capacity: null },
  { name: '健二', hasCar: true, latitude: 35.6672, longitude: 139.7306, pickupLocation: '東京駅', capacity: 5 },
  { name: '由美', hasCar: false, latitude: 35.7313, longitude: 139.7580, pickupLocation: '北千住駅', capacity: null },
  { name: '拓也', hasCar: true, latitude: 35.5308, longitude: 139.7029, pickupLocation: 'さいたま新都心駅', capacity: 4 },
  { name: '春奈', hasCar: false, latitude: 35.4437, longitude: 139.6380, pickupLocation: '横浜駅', capacity: null }
]

// ルート
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' })
})

// Supabase接続テスト
app.get('/api/db-test', async (req, res) => {
  const { data, error } = await supabase
    .from('members')
    .select('id')
    .limit(1)

  if (error) {
    console.error('Supabase接続エラー:', error.message)
    return res.status(500).json({
      status: 'error',
      message: 'データベースへのアクセスに失敗しました'
    })
  }

  res.json({
    status: 'OK',
    message: 'Supabaseに接続できました'
  })
})

// ログインエンドポイント
app.post('/api/login', (req, res) => {
  const { passphrase } = req.body

  // 入力値の検証
  if (!passphrase) {
    return res.status(400).json({ message: '合言葉を入力してください' })
  }

  // パスフレーズの確認
  if (passphrase === PASSPHRASE) {
    // 本来はJWTなどでトークンを生成
    const token = Buffer.from(JSON.stringify({ 
      timestamp: Date.now(),
      authenticated: true
    })).toString('base64')

    return res.status(200).json({
      message: 'ログインに成功しました',
      token: token
    })
  } else {
    return res.status(401).json({ message: '合言葉が正しくありません' })
  }
})

// 練習日程取得エンドポイント
app.get('/api/schedule', async (req, res) => {
  // Supabaseから練習日程を取得
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .order('date', { ascending: true })

  if (error) {
    console.error('練習日程取得エラー:', error.message)
    return res.status(500).json({
      message: '練習日程の取得に失敗しました'
    })
  }

  // フロントエンドで使う月ごとの形式にまとめる
  const schedule = {}

  data.forEach(item => {
    const month = item.date.slice(0, 7)

    if (!schedule[month]) {
      schedule[month] = []
    }

    schedule[month].push({
      id: item.id,
      date: item.date,
      time: item.time,
      location: item.location,
      notes: item.notes
    })
  })

  res.json({ schedule })
})

// 練習日程追加エンドポイント
app.post('/api/schedule', async (req, res) => {
  const { date, time, location, notes } = req.body

  // バリデーション
  if (!date || !time || !location) {
    return res.status(400).json({
      message: '日付、時間、場所は必須です'
    })
  }

  // Supabaseに保存するデータ
  const newSchedule = {
    date,
    time,
    location,
    notes: notes || ''
  }

  // Supabaseに練習日程を追加
  const { data, error } = await supabase
    .from('schedules')
    .insert(newSchedule)
    .select()
    .single()

  if (error) {
    console.error('練習日程追加エラー:', error.message)
    return res.status(500).json({
      message: '練習日程の追加に失敗しました'
    })
  }

  return res.status(201).json({
    message: '日程を追加しました',
    schedule: {
      id: data.id,
      date: data.date,
      time: data.time,
      location: data.location,
      notes: data.notes
    }
  })
})

// 練習日程削除エンドポイント
app.delete('/api/schedule', async (req, res) => {
  const { date, time, location } = req.body

  // 必須項目の確認
  if (!date || !time || !location) {
    return res.status(400).json({
      message: '日付、時間、場所は必須です'
    })
  }

  // 削除対象の日程を検索
  const { data: targetSchedule, error: searchError } = await supabase
    .from('schedules')
    .select('*')
    .eq('date', date)
    .eq('time', time)
    .eq('location', location)
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (searchError) {
    console.error('練習日程検索エラー:', searchError.message)
    return res.status(500).json({
      message: '練習日程の検索に失敗しました'
    })
  }

  if (!targetSchedule) {
    return res.status(404).json({
      message: '日程が見つかりません'
    })
  }

  // Supabaseから日程を削除
  const { error: deleteError } = await supabase
    .from('schedules')
    .delete()
    .eq('id', targetSchedule.id)

  if (deleteError) {
    console.error('練習日程削除エラー:', deleteError.message)
    return res.status(500).json({
      message: '練習日程の削除に失敗しました'
    })
  }

  return res.status(200).json({
    message: '日程を削除しました',
    schedule: {
      id: targetSchedule.id,
      date: targetSchedule.date,
      time: targetSchedule.time,
      location: targetSchedule.location,
      notes: targetSchedule.notes
    }
  })
})

// メンバー取得エンドポイント
app.get('/api/members', async (req, res) => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('id', { ascending: true })

  if (error) {
    console.error('メンバー取得エラー:', error.message)
    return res.status(500).json({
      message: 'メンバーの取得に失敗しました'
    })
  }

  // データベースの列名をフロントエンドの形式に変換
  const members = data.map(member => ({
    id: member.id,
    name: member.name,
    hasCar: member.has_car,
    latitude: member.latitude,
    longitude: member.longitude,
    pickupLocation: member.pickup_location,
    capacity: member.capacity
  }))

  res.json({ members })
})

// メンバー追加エンドポイント
app.post('/api/members', async (req, res) => {
  const { name, hasCar, latitude, longitude, pickupLocation, capacity } = req.body

  // バリデーション
  if (!name || latitude === undefined || longitude === undefined || !pickupLocation) {
    return res.status(400).json({ 
      message: '名前、緯度、経度、送迎場所の名前は必須です' 
    })
  }

  // 車がある場合は乗車可能人数の確認
  if (hasCar && !capacity) {
    return res.status(400).json({ 
      message: '車がある場合は乗車可能人数を指定してください' 
    })
  }

// 送迎場所の名前を整える
const locationName = pickupLocation.trim()

let location

// 名前の末尾が「宅」ではない場合だけ、共通の送迎場所として管理
if (!locationName.endsWith('宅')) {
  // 登録済みの送迎場所を検索
  const { data: existingLocation, error: locationSearchError } = await supabase
    .from('pickup_locations')
    .select('id, name, latitude, longitude')
    .eq('name', locationName)
    .maybeSingle()

  if (locationSearchError) {
    console.error('送迎場所検索エラー:', locationSearchError.message)

    return res.status(500).json({
      message: '送迎場所の検索に失敗しました'
    })
  }

  location = existingLocation

  // 未登録なら、新しい送迎場所を登録
  if (!location) {
    const { data: newLocation, error: locationInsertError } = await supabase
      .from('pickup_locations')
      .insert({
        name: locationName,
        latitude: Number(latitude),
        longitude: Number(longitude)
      })
      .select('id, name, latitude, longitude')
      .single()

    if (locationInsertError) {
      console.error('送迎場所登録エラー:', locationInsertError.message)

      return res.status(500).json({
        message: '送迎場所の登録に失敗しました'
      })
    }

    location = newLocation
  }
}

// メンバーに保存する送迎場所の情報
const memberLocation = location || {
  name: locationName,
  latitude: Number(latitude),
  longitude: Number(longitude)
}

// Supabaseに保存するメンバーデータ
const newMember = {
  name: name,
  has_car: hasCar || false,
  latitude: memberLocation.latitude,
  longitude: memberLocation.longitude,
  pickup_location: memberLocation.name,
  capacity: hasCar ? capacity : null
}

// Supabaseにメンバーを追加
  const { data, error } = await supabase

    .from('members')
    .insert(newMember)
    .select()
    .single()

  if (error) {
    console.error('メンバー追加エラー:', error.message)

    return res.status(500).json({
      message: 'メンバーの追加に失敗しました'
    })
  }

  // フロントエンド向けの形式に変換

  const member = {
    id: data.id,
    name: data.name,
    hasCar: data.has_car,
    latitude: data.latitude,
    longitude: data.longitude,
    pickupLocation: data.pickup_location,
    capacity: data.capacity
  }

  return res.status(201).json({
    message: 'メンバーを追加しました', member
  })

})

// メンバー削除エンドポイント
app.delete('/api/members', async (req, res) => {
  const { name } = req.body

  if (!name) {
    return res.status(400).json({
      message: 'メンバーの名前が必要です'
    })
  }

  // 削除対象のメンバーを検索
  const { data: targetMember, error: searchError } = await supabase
    .from('members')
    .select('*')
    .eq('name', name)
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (searchError) {
    console.error('メンバー検索エラー:', searchError.message)
    return res.status(500).json({
      message: 'メンバーの検索に失敗しました'
    })
  }

  if (!targetMember) {
    return res.status(404).json({
      message: 'メンバーが見つかりません'
    })
  }

  // Supabaseからメンバーを削除
  const { error: deleteError } = await supabase
    .from('members')
    .delete()
    .eq('id', targetMember.id)

  if (deleteError) {
    console.error('メンバー削除エラー:', deleteError.message)
    return res.status(500).json({
      message: 'メンバーの削除に失敗しました'
    })
  }

  // フロントエンド向けの形式に変換
  const deletedMember = {
    id: targetMember.id,
    name: targetMember.name,
    hasCar: targetMember.has_car,
    latitude: targetMember.latitude,
    longitude: targetMember.longitude,
    pickupLocation: targetMember.pickup_location,
    capacity: targetMember.capacity
  }

  return res.status(200).json({
    message: 'メンバーを削除しました',
    member: deletedMember
  })
})

// メンバー編集エンドポイント
app.put('/api/members', async (req, res) => {
  const {
    originalName,
    name,
    hasCar,
    latitude,
    longitude,
    pickupLocation,
    capacity
  } = req.body

  // バリデーション
  if (
    !originalName ||
    !name ||
    latitude === undefined ||
    longitude === undefined ||
    !pickupLocation
  ) {
    return res.status(400).json({
      message: '名前、緯度、経度、送迎場所の名前は必須です'
    })
  }

  // 車がある場合は乗車可能人数の確認
  if (hasCar && !capacity) {
    return res.status(400).json({
      message: '車がある場合は乗車可能人数を指定してください'
    })
  }

  // 編集対象のメンバーを検索
  const { data: targetMember, error: searchError } = await supabase
    .from('members')
    .select('*')
    .eq('name', originalName)
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (searchError) {
    console.error('メンバー検索エラー:', searchError.message)
    return res.status(500).json({
      message: 'メンバーの検索に失敗しました'
    })
  }

  if (!targetMember) {
    return res.status(404).json({
      message: 'メンバーが見つかりません'
    })
  }

  // Supabaseのデータを更新
  const { data, error } = await supabase
    .from('members')
    .update({
      name,
      has_car: hasCar || false,
      latitude,
      longitude,
      pickup_location: pickupLocation,
      capacity: hasCar ? capacity : null
    })
    .eq('id', targetMember.id)
    .select()
    .single()

  if (error) {
    console.error('メンバー編集エラー:', error.message)
    return res.status(500).json({
      message: 'メンバーの編集に失敗しました'
    })
  }

  // フロントエンド向けの形式に変換
  const member = {
    id: data.id,
    name: data.name,
    hasCar: data.has_car,
    latitude: data.latitude,
    longitude: data.longitude,
    pickupLocation: data.pickup_location,
    capacity: data.capacity
  }

  return res.status(200).json({
    message: 'メンバーを編集しました',
    member
  })
})

// 車割り保存エンドポイント
app.post('/api/assignments', async (req, res) => {
  const { scheduleId, participantIds, assignments } = req.body

  // 車割り取得エンドポイント


  // 入力チェック
  if (
    !scheduleId ||
    !Array.isArray(participantIds) ||
    !Array.isArray(assignments)
  ) {
    return res.status(400).json({
      message: '車割りの保存に必要な情報が不足しています'
    })
  }

  // 参加者データを作成
  const participants = participantIds.map(memberId => ({
    schedule_id: scheduleId,
    member_id: memberId
  }))

  // 車割りデータを作成
  const assignmentRows = []

  assignments.forEach(assignment => {
    // 運転手自身も割り当てに含める
    assignmentRows.push({
      schedule_id: scheduleId,
      member_id: assignment.driverId,
      driver_id: assignment.driverId,
      pickup_order: 0
    })

    // 同乗者を割り当てる
    assignment.passengerIds.forEach((passengerId, index) => {
      assignmentRows.push({
        schedule_id: scheduleId,
        member_id: passengerId,
        driver_id: assignment.driverId,
        pickup_order: index + 1
      })
    })
  })

  // 既存の参加者情報を削除
  const { error: participantDeleteError } = await supabase
    .from('participants')
    .delete()
    .eq('schedule_id', scheduleId)

  if (participantDeleteError) {
    console.error('参加者削除エラー:', participantDeleteError.message)
    return res.status(500).json({
      message: '参加者情報の更新に失敗しました'
    })
  }

  // 既存の車割り情報を削除
  const { error: assignmentDeleteError } = await supabase
    .from('assignments')
    .delete()
    .eq('schedule_id', scheduleId)

  if (assignmentDeleteError) {
    console.error('車割り削除エラー:', assignmentDeleteError.message)
    return res.status(500).json({
      message: '既存の車割り情報の削除に失敗しました'
    })
  }

  // 参加者を保存
  if (participants.length > 0) {
    const { error } = await supabase
    .from('participants')
    .upsert(participants, {
      onConflict: 'schedule_id,member_id'
    })

  if (error) {
    console.error('参加者保存エラー:', error.message)
    return res.status(500).json({
      message: '参加者情報の保存に失敗しました'
    })
  }
}

  // 車割りを保存
  if (assignmentRows.length > 0) {
    const { error } = await supabase
      .from('assignments')
      .insert(assignmentRows)

    if (error) {
      console.error('車割り保存エラー:', error.message)
      return res.status(500).json({
        message: '車割りの保存に失敗しました'
      })
    }
  }

  return res.status(200).json({
    message: '車割りを保存しました'
  })
})


app.get('/api/assignments/:scheduleId', async (req, res) => {
  const scheduleId = Number(req.params.scheduleId)

  if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
    return res.status(400).json({
      message: '予定IDが正しくありません'
    })
  }

  const { data, error } = await supabase
    .from('assignments')
    .select(`
      member_id,
      driver_id,
      pickup_order,
      member:members!assignments_member_id_fkey (
        id,
        name
      ),
      driver:members!assignments_driver_id_fkey (
        id,
        name
      )
    `)
    .eq('schedule_id', scheduleId)
    .order('pickup_order', { ascending: true })

  if (error) {
    console.error('車割り取得エラー:', error.message)
    return res.status(500).json({
      message: '車割りの取得に失敗しました'
    })
  }

  const assignmentsMap = new Map()

  data.forEach(item => {
    if (!assignmentsMap.has(item.driver_id)) {
      assignmentsMap.set(item.driver_id, {
        driver: item.driver,
        passengers: []
      })
    }

    // 運転手本人は同乗者に含めない
    if (item.member_id !== item.driver_id) {
      assignmentsMap.get(item.driver_id).passengers.push({
        id: item.member.id,
        name: item.member.name,
        pickupOrder: item.pickup_order
      })
    }
  })

  res.json({
    assignments: Array.from(assignmentsMap.values())
  })
})

// 参加者取得エンドポイント
app.get('/api/participants/:scheduleId', async (req, res) => {
  const scheduleId = Number(req.params.scheduleId)

  if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
    return res.status(400).json({
      message: '予定IDが正しくありません'
    })
  }

  const { data, error } = await supabase
    .from('participants')
    .select('member_id')
    .eq('schedule_id', scheduleId)

  if (error) {
    console.error('参加者取得エラー:', error.message)
    return res.status(500).json({
      message: '参加者の取得に失敗しました'
    })
  }

  res.json({
    participantIds: data.map(item => item.member_id)
  })
})


// 送迎場所一覧取得エンドポイント
app.get('/api/pickup-locations', async (req, res) => {
  const { data, error } = await supabase
    .from('pickup_locations')
    .select('id, name, latitude, longitude')
    .order('name', { ascending: true })

  if (error) {
    console.error('送迎場所取得エラー:', error)

    return res.status(500).json({
      message: '送迎場所の取得に失敗しました'
    })
  }

  return res.status(200).json({
    locations: data
  })
})

// 送迎場所登録エンドポイント
app.post('/api/pickup-locations', async (req, res) => {
  const { name, latitude, longitude } = req.body

  // 入力チェック
  if (
    !name?.trim() ||
    latitude === undefined ||
    longitude === undefined ||
    latitude === null ||
    longitude === null ||
    !Number.isFinite(Number(latitude)) ||
    !Number.isFinite(Number(longitude)) ||
    Number(latitude) < -90 ||
    Number(latitude) > 90 ||
    Number(longitude) < -180 ||
    Number(longitude) > 180
  ) {
    return res.status(400).json({
      message: '送迎場所の名前、緯度、経度を正しく入力してください'
    })
  }

  // 同じ名前の送迎場所があるか確認
  const { data: existingLocation, error: searchError } = await supabase
    .from('pickup_locations')
    .select('id, name, latitude, longitude')
    .eq('name', name.trim())
    .maybeSingle()

  if (searchError) {
    console.error('送迎場所検索エラー:', searchError.message)

    return res.status(500).json({
      message: '送迎場所の検索に失敗しました'
    })
  }

  // 登録済みなら既存データを返す
  if (existingLocation) {
    return res.status(200).json({
      message: '登録済みの送迎場所です',
      location: existingLocation
    })
  }

  // 新しい送迎場所を登録
  const { data, error } = await supabase
    .from('pickup_locations')
    .insert({
      name: name.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude)
    })
    .select()
    .single()

  if (error) {
    console.error('送迎場所登録エラー:', error.message)

    return res.status(500).json({
      message: '送迎場所の登録に失敗しました'
    })
  }

  return res.status(201).json({
    message: '送迎場所を登録しました',
    location: data
  })
})



// サーバー起動
app.listen(PORT, () => {
  console.log(`🚗 車割りアプリ - バックエンドサーバー起動`)
  console.log(`📍 ポート: ${PORT}`)
})
