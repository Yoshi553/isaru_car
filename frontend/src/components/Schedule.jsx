import { useState } from "react";
import api from "../api";
import "./Schedule.css";

function Schedule({
  scheduleData,
  selectedMonth,
  onMonthChange,
  onScheduleAdded,
  onScheduleSelect,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    location: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const months = Object.keys(scheduleData).sort();
  const currentSchedules = scheduleData[selectedMonth] || [];

  const handlePrevMonth = () => {
    const months = Object.keys(scheduleData).sort();
    const currentIndex = months.indexOf(selectedMonth);
    if (currentIndex > 0) {
      onMonthChange(months[currentIndex - 1]);
    }
  };

  const handleNextMonth = () => {
    const months = Object.keys(scheduleData).sort();
    const currentIndex = months.indexOf(selectedMonth);
    if (currentIndex < months.length - 1) {
      onMonthChange(months[currentIndex + 1]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    console.log("data", formData);
    // バリデーション
    if (!formData.date || !formData.location) {
      setFormError("日付、場所は必須です");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/api/schedule", formData);
      setFormData({ date: "", location: "", notes: "" });
      setShowAddForm(false);
      if (onScheduleAdded) {
        onScheduleAdded();
      }
    } catch (err) {
      console.error("日程追加エラー:", err.response?.data);
      console.error("HTTPステータス:", err.response?.status);

      setFormError(err.response?.data?.message || "日程の追加に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (schedule) => {
    const confirmed = window.confirm(
      `${formatDate(schedule.date)} ${schedule.location} の練習日程を削除しますか？`,
    );

    if (!confirmed) return;

    try {
      await api.delete("/api/schedule", {
        data: {
          date: schedule.date,
          location: schedule.location,
        },
      });

      alert("練習日程を削除しました！");

      if (onScheduleAdded) {
        onScheduleAdded();
      }
    } catch (error) {
      console.error("日程の削除に失敗しました:", error);
      console.error("レスポンス:", error.response?.data);
      console.error("HTTPステータス:", error.response?.status);

      alert(
        error.response?.data?.message ||
          error.message ||
          "練習日程の削除に失敗しました。",
      );
    }
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setFormData({ date: "", location: "", notes: "" });
    setFormError("");
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
    });
  };

  const formatMonthDisplay = (monthStr) => {
    const [year, month] = monthStr.split("-");
    return `${year}年${parseInt(month)}月`;
  };

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <div className="schedule-title-row">
          <h2>⚽️ 練習日程</h2>

          <button
            onClick={() => setShowAddForm(true)}
            className="add-schedule-btn"
          >
            ➕ 追加
          </button>
        </div>

        <div className="month-selector">
          <button
            onClick={handlePrevMonth}
            disabled={months.indexOf(selectedMonth) === 0}
            className="month-btn"
          >
            ◀
          </button>

          <span className="month-display">
            {formatMonthDisplay(selectedMonth)}
          </span>

          <button
            onClick={handleNextMonth}
            disabled={months.indexOf(selectedMonth) === months.length - 1}
            className="month-btn"
          >
            ▶
          </button>
        </div>
      </div>
      <div className="schedules-list">
        {currentSchedules.length > 0 ? (
          currentSchedules.map((schedule, index) => (
            <div key={schedule.id ?? index}
            className={`schedule-card ${
              schedule.date < new Date().toLocaleDateString('sv-SE')
              ? 'past-schedule'
              : ''
            }`}>
              <div
                className="schedule-info"
                onClick={() => onScheduleSelect && onScheduleSelect(schedule)}
              >
                <div className="schedule-date">
                  {formatDate(schedule.date)} 📍 {schedule.location}
                </div>

                {schedule.notes && (
                  <div className="schedule-notes">📝 {schedule.notes}</div>
                )}
              </div>

              <button
                className="delete-schedule-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSchedule(schedule);
                }}
              >
                🗑️
              </button>
            </div>
          ))
        ) : (
          <div className="empty-message">
            この月の練習日程はまだ登録されていません
          </div>
        )}
      </div>

      {/* 日程追加モーダル */}
      {showAddForm && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>練習日程を追加</h3>
              <button onClick={handleCloseForm} className="close-btn">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="add-schedule-form">
              {formError && <div className="form-error">{formError}</div>}

              <div className="form-group">
                <label htmlFor="date">日付 *</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="location">場所 *</label>
                <select
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">場所を選択してください</option>
                  <option value="豊里">豊里</option>
                  <option value="セキショウ">セキショウ</option>
                  <option value="その他">その他</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="notes">備考</label>
                <input
                  type="text"
                  id="notes"
                  name="notes"
                  placeholder="メンバー練"
                  value={formData.notes}
                  onChange={handleInputChange}
                />
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
                  {isSubmitting ? "追加中..." : "追加"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Schedule;
