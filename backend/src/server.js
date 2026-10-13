import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)

const app = express()
const PORT = process.env.PORT || 3001
const PASSPHRASE = process.env.PASSPHRASE || 'secret123'

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
app.get('/api/schedule', (req, res) => {
  res.json({
    schedule: scheduleData
  })
})

// 練習日程追加エンドポイント
app.post('/api/schedule', (req, res) => {
  const { date, time, location, notes } = req.body

  // バリデーション
  if (!date || !time || !location) {
    return res.status(400).json({ 
      message: '日付、時間、場所は必須です' 
    })
  }

  // 日付からYYYY-MM形式を抽出
  const month = date.slice(0, 7)

  // 月が存在しない場合は作成
  if (!scheduleData[month]) {
    scheduleData[month] = []
  }

  // 新しい日程をリストに追加
  const newSchedule = {
    date: date,
    time: time,
    location: location,
    notes: notes || ''
  }

  scheduleData[month].push(newSchedule)

  // 日付でソート
  scheduleData[month].sort((a, b) => new Date(a.date) - new Date(b.date))

  return res.status(201).json({
    message: '日程を追加しました',
    schedule: newSchedule
  })
})

// 練習日程削除エンドポイント
app.delete('/api/schedule', (req, res) => {
  const { date, time, location } = req.body

  const month = date.slice(0, 7)

  if (!scheduleData[month]) {
    return res.status(404).json({ 
      message: '日程が見つかりません' 
    })
  }

  const index = scheduleData[month].findIndex(
    schedule => 
      schedule.date === date && 
      schedule.time === time && 
      schedule.location === location
  )

  if (index === -1) {
    return res.status(404).json({ 
      message: '日程が見つかりません' 
    })
  }

  const deletedSchedule = scheduleData[month].splice(index, 1)[0]

  return res.status(200).json({
    message: '日程を削除しました',
    schedule: deletedSchedule
  })
})

// メンバー取得エンドポイント
app.get('/api/members', (req, res) => {
  res.json({
    members: membersData
  })
})

// メンバー追加エンドポイント
app.post('/api/members', (req, res) => {
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

  // 新しいメンバーを作成
  const newMember = {
    name: name,
    hasCar: hasCar || false,
    latitude: latitude,
    longitude: longitude,
    pickupLocation: pickupLocation,
    capacity: hasCar ? capacity : null
  }

  membersData.push(newMember)

  return res.status(201).json({
    message: 'メンバーを追加しました',
    member: newMember
  })
})

// メンバー削除エンドポイント
app.delete('/api/members', (req, res) => {
  const { name } = req.body

  const index = membersData.findIndex(member => member.name === name)

  if (index === -1) {
    return res.status(404).json({ 
      message: 'メンバーが見つかりません' 
    })
  }

  const deletedMember = membersData.splice(index, 1)[0]

  return res.status(200).json({
    message: 'メンバーを削除しました',
    member: deletedMember
  })
})

// メンバー編集エンドポイント
app.put('/api/members', (req, res) => {
  const { originalName, name, hasCar, latitude, longitude, pickupLocation, capacity } = req.body

  // バリデーション
  if (!originalName || !name || latitude === undefined || longitude === undefined || !pickupLocation) {
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

  const index = membersData.findIndex(member => member.name === originalName)

  if (index === -1) {
    return res.status(404).json({ 
      message: 'メンバーが見つかりません' 
    })
  }

  // メンバー情報を更新
  membersData[index] = {
    name: name,
    hasCar: hasCar || false,
    latitude: latitude,
    longitude: longitude,
    pickupLocation: pickupLocation,
    capacity: hasCar ? capacity : null
  }

  return res.status(200).json({
    message: 'メンバーを編集しました',
    member: membersData[index]
  })
})

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚗 車割りアプリ - バックエンドサーバー起動`)
  console.log(`📍 ポート: ${PORT}`)
  console.log(`🔐 現在のパスフレーズ: ${PASSPHRASE}`)
  console.log(`💡 環境変数PASSPHRASEで変更できます`)
})
