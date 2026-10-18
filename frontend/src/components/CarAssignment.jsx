import { useEffect, useState } from "react";
import api from "../api";
import "./CarAssignment.css";

function CarAssignment({ schedule, membersData, onBack, onLogout }) {
  const sortedMembersData = membersData
    .map((member, index) => ({ ...member, originalIndex: index }))
    .sort((a, b) => {
      const yearA = a.enrollmentYear ?? Infinity;
      const yearB = b.enrollmentYear ?? Infinity;

      if (yearA !== yearB) {
        return yearA - yearB;
      }
      return a.name.localeCompare(b.name, "ja");
    });

  const [assignments, setAssignments] = useState([]);
  const [selectedPassenger, setSelectedPassenger] = useState(null);
  const [participantRoles, setParticipantRoles] = useState(new Map());
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);
  const [unassignmentPassengers, setUnassignmentPassengers] = useState([]);
  const [showParticipants, setShowParticipants] = useState(true);

  // 保存済みの車割りを読み込む
  useEffect(() => {
    const fetchAssignments = async () => {
      if (!schedule?.id) return;

      try {
        setIsLoadingAssignments(true);
        setIsLoadingParticipants(true);

        // 保存済みの車割りを取得
        const response = await api.get(`/api/assignments/${schedule.id}`);

        const data = response.data;
        const savedAssignments = data.assignments ?? [];

        console.log("保存済みの車割り:", savedAssignments);

        setAssignments(savedAssignments);

        // 保存済みの参加者を取得
        const participantResponse = await api.get(
          `/api/participants/${schedule.id}`,
        );

        const participantData = participantResponse.data;
        const participantIds = participantData.participantIds ?? [];

        console.log("保存済みの参加者ID:", participantIds);

        // 運転手と乗客の役割を復元
        const restoredRoles = new Map();

        savedAssignments.forEach((assignment) => {
          if (assignment.driver?.id != null) {
            restoredRoles.set(assignment.driver.id, 1);
          }

          (assignment.passengers ?? []).forEach((passenger) => {
            if (passenger.id != null) {
              restoredRoles.set(passenger.id, 2);
            }
          });
        });

        // 車に割り当てられていない参加者は乗客として復元
        membersData.forEach((member) => {
          if (
            participantIds.includes(member.id) &&
            !restoredRoles.has(member.id)
          ) {
            restoredRoles.set(member.id, 2);
          }
        });

        setParticipantRoles(restoredRoles);

        console.log("復元した役割:", [...restoredRoles.entries()]);
      } catch (error) {
        console.error("車割り取得エラー:", error);
      } finally {
        setIsLoadingAssignments(false);
        setIsLoadingParticipants(false);
      }
    };

    fetchAssignments();
  }, [schedule?.id, membersData]);
  const handleParticipantToggle = (memberId) => {
    setParticipantRoles((prev) => {
      const next = new Map(prev);
      const currentRole = next.get(memberId) ?? 0;

      const member = membersData.find((member) => member.id === memberId);

      // 不参加 → 運転手 → 乗客 → 不参加
      let nextRole = (currentRole + 1) % 3;

      if (!member?.hasCar && nextRole === 1) {
        nextRole = 2;
      }

      if (nextRole === 0) {
        next.delete(memberId);
      } else {
        next.set(memberId, nextRole);
      }

      return next;
    });
  };

  const driverCount = [...participantRoles.values()].filter(
    (role) => role === 1,
  ).length;

  const handleMovePassenger = async (targetDriverId) => {
    if (!selectedPassenger) return;

    const updatedAssignments = assignments.map((assignment) => {
      const remainingPassengers = assignment.passengers.filter(
        (passenger) => passenger.id !== selectedPassenger.id,
      );

      if (assignment.driver.id === targetDriverId) {
        return {
          ...assignment,
          passengers: [...remainingPassengers, selectedPassenger],
        };
      }

      return {
        ...assignment,
        passengers: remainingPassengers,
      };
    });

    // 画面の車割りを更新
    setAssignments(updatedAssignments);
    setSelectedPassenger(null);

    try {
      // 更新した車割りをSupabaseに保存
      await api.post("/api/assignments", {
        scheduleId: schedule.id,
        participantIds: [...participantRoles.keys()],
        assignments: updatedAssignments.map((assignment) => ({
          driverId: assignment.driver.id,
          passengerIds: assignment.passengers.map((passenger) => passenger.id),
        })),
      });

      console.log("移動後の車割りを保存しました");
    } catch (error) {
      console.error("車割り保存エラー:", error);
      alert(
        "車割りの保存に失敗しました。ページを更新する前に、もう一度保存状況を確認してください。",
      );
    }
  };

  // 車割り作成のロジック
  const calcDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // 地球の半径 (km)
    const toRad = (degree) => (degree * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // 距離 (km)
  };

  const handleCreateAssignments = async () => {
    // 青色（role === 1）の人をドライバーにする
    const drivers = membersData.filter(
      (member) => participantRoles.get(member.id) === 1,
    );

    // 緑色（role === 2）の人を乗客にする
    const passengers = membersData.filter(
      (member) => participantRoles.get(member.id) === 2,
    );

    console.log("Drivers:", drivers);
    console.log("Passengers:", passengers);

    const newAssignments = drivers.map((driver) => ({
      driver: driver,
      passengers: [],
    }));

    const unassignmened = [];

    passengers.forEach((passenger) => {
      const availableCars = newAssignments.filter(
        (assignment) =>
          assignment.passengers.length < assignment.driver.capacity - 1,
      );

      if (availableCars.length === 0) {
        unassignmened.push(passenger);
        return;
      }

      const nearestCar = availableCars.reduce((nearest, current) => {
        const nearestDistance = calcDistance(
          passenger.latitude,
          passenger.longitude,
          nearest.driver.latitude,
          nearest.driver.longitude,
        );

        const currentDistance = calcDistance(
          passenger.latitude,
          passenger.longitude,
          current.driver.latitude,
          current.driver.longitude,
        );

        return currentDistance < nearestDistance ? current : nearest;
      });

      nearestCar.passengers.push(passenger);
    });

    setAssignments(newAssignments);
    setShowParticipants(false);
    setUnassignmentPassengers(unassignmened);
    console.log("Assignments:", newAssignments);

    try {
      await api.post("/api/assignments", {
        scheduleId: schedule.id,
        participantIds: [...participantRoles.keys()],
        assignments: newAssignments.map((assignment) => ({
          driverId: assignment.driver.id,
          passengerIds: assignment.passengers.map((passenger) => passenger.id),
        })),
      });

      console.log("車割りを保存しました");
    } catch (error) {
      console.error("車割り保存エラー:", error);
    }
  };

  const handleCopyAssignments = async () => {
    const text = [
      "【車割り結果】",
      ...assignments.map((assignment) => {
        const passengers = assignment.passengers
          .map((passenger) => `・${passenger.name}`)
          .join("\n");

        return [
          `🚗 ${assignment.driver.name}カー（${assignment.passengers.length + 1}/${assignment.driver.capacity}名）`,
          passengers,
        ]
          .filter(Boolean)
          .join("\n");
      }),
      ...(unassignmentPassengers.length > 0
        ? [
            "",
            "⚠️ 車が足りません",
            ...unassignmentPassengers.map((member) => `・${member.name}`),
          ]
        : []),
    ].join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      alert("車割り結果をコピーしました！");
    } catch (error) {
      console.error("コピーに失敗しました:", error);
      alert("コピーに失敗しました。");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + "T00:00:00");
    const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDay = weekDays[date.getDay()];
    return `${month}/${day} (${weekDay})`;
  };

  // 役割が選択されている参加者
  const selectedParticipantsData = membersData.filter((member) =>
    participantRoles.has(member.id),
  );

  // 運転手に選択されている人
  const driverCandidates = membersData.filter(
    (member) => participantRoles.get(member.id) === 1,
  );

  return (
    <div className="car-assignment-container">
      <header className="dashboard-header">
        <div className="header-left">
          <button onClick={onBack} className="back-button">
            ←
          </button>
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


             <button
              className="toggle-participants-button"
              onClick={() => setShowParticipants(!showParticipants)}
            >
              {showParticipants ? "▲ 閉じる" : "▼ 参加者を表示"}
            </button>

            <div className="participant-count">
              <span className="participant-count-badge">
                合計参加者：{participantRoles.size}名
                </span>
              <span className="driver-count-badge">
                運転手：{driverCount}名
              </span>
            </div>

            <p className="participant-instruction">
              カードをタップして役割変更可能（運転手のみ）
              <br />⚪️不参加→🟢運転手→🔵乗客
            </p>

           
 
          </div>

          {showParticipants && (
            <div className="members-list">
              {isLoadingParticipants ? (
                <p className="loading-message">参加者取得中...</p>
              ) : membersData.length > 0 ? (
                sortedMembersData.map((member) => (
                  <div
                    key={member.id}
                    className={`participant-card ${
                      participantRoles.get(member.id) === 1
                        ? "selected driver-selected"
                        : participantRoles.get(member.id) === 2
                          ? "selected passenger-selected"
                          : ""
                    }`}
                    onClick={() => handleParticipantToggle(member.id)}
                  >
                    <div className="participant-info">
                      <div className="participant-name">{member.name}</div>
                      {member.hasCar && (
                        <div className="participant-car">
                          🚗 {member.capacity}名
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-message">
                  メンバーがまだ登録されていません
                </div>
              )}
            </div>
          )}
        </div>

        <div className="assignment-actions">
          <button
            className="create-button"
            disabled={participantRoles === 0}
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

            <button className="copy-button" onClick={handleCopyAssignments}>
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
                      {assignment.passengers.length + 1}/
                      {assignment.driver.capacity}名
                    </span>
                  </div>

                  {assignment.passengers.map((passenger, passengerIndex) => (
                    <div
                      key={passengerIndex}
                      className="assignment-passenger"
                      onClick={() => setSelectedPassenger(passenger)}
                    >
                      {passenger.name}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {selectedPassenger && (
        <div className="modal-overlay">
          <div className="move-modal">
            <h2>{selectedPassenger.name}の移動先</h2>
            <p>移動する車を選択してください。</p>

            <div className="move-car-list">
              {assignments

                .filter((assignment) => {
                  const isCurrentCar = assignment.passengers.some(
                    (passenger) => passenger.id === selectedPassenger.id,
                  );

                  const isFull =
                    assignment.passengers.length + 1 >=
                    assignment.driver.capacity;

                  return !isCurrentCar && !isFull;
                })

                .map((assignment) => (
                  <button
                    key={assignment.driver.id}
                    className="move-car-option"
                    onClick={() => handleMovePassenger(assignment.driver.id)}
                  >
                    🚗 {assignment.driver.name}カー （
                    {assignment.passengers.length + 1}/
                    {assignment.driver.capacity}名）
                  </button>
                ))}

              {assignments.filter((assignment) => {
                const isCurrentCar = assignment.passengers.some(
                  (passenger) => passenger.id === selectedPassenger.id,
                );

                const isFull =
                  assignment.passengers.length + 1 >=
                  assignment.driver.capacity;

                return !isCurrentCar && !isFull;
              }).length === 0 && <p>移動できる車がありません。</p>}
            </div>

            <button
              className="modal-cancel-button"
              onClick={() => setSelectedPassenger(null)}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CarAssignment;
